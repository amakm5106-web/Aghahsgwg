import { hashSync, compareSync } from 'bcryptjs';
import type { Pool, PoolConnection } from 'mysql2/promise';

interface UserRecord {
  id: number;
  identifier: string;
  identifier_type: 'email' | 'phone';
  password_hash: string;
  status: 'active' | 'suspended';
  created_at: Date;
}

interface SessionRecord {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

interface WalletRecord {
  user_id: number;
  balance_mmk: number;
  updated_at: Date;
}

interface PaymentRequestRecord {
  id: number;
  user_id: number;
  kind: 'deposit' | 'withdrawal';
  amount_mmk: number | null;
  status: 'pending' | 'approved' | 'rejected';
  phone: string;
  transfer_id?: string | null;
  provider_code?: string | null;
  payout_reference?: string | null;
  admin_note?: string | null;
  reviewed_at?: Date | null;
  reviewed_by_user_id?: number | null;
  created_at: Date;
}

interface LedgerRecord {
  id: number;
  user_id: number;
  bet_id: number | null;
  kind: string;
  amount_mmk: number;
  balance_after_mmk: number;
  reference_key: string;
  created_at: Date;
}

interface ProviderRecord {
  code: string;
  name: string;
  receiver_phone: string;
  receiver_name: string;
  status: 'active' | 'disabled';
  updated_at: Date;
}

function normalizeIdent(ident: string): string {
  const s = String(ident).trim().toLowerCase();
  if (s.startsWith('+959')) return s;
  if (s.startsWith('09')) return `+959${s.slice(2)}`;
  if (s.startsWith('959')) return `+${s}`;
  return s;
}

class MockDatabase {
  users: UserRecord[] = [];
  sessions: SessionRecord[] = [];
  roles: Map<number, 'user' | 'admin'> = new Map();
  wallets: Map<number, WalletRecord> = new Map();
  requests: PaymentRequestRecord[] = [];
  ledger: LedgerRecord[] = [];
  providers: ProviderRecord[] = [];

  private nextUserId = 1;
  private nextSessionId = 1;
  private nextRequestId = 1;
  private nextLedgerId = 1;

  constructor() {
    this.seedDefaultData();
  }

  seedDefaultData() {
    const passwordHash = hashSync('Password123!', 10);

    // Default test player (+959987654321 / 09987654321) with 100,000 MMK starter balance for testing bets
    const player: UserRecord = {
      id: this.nextUserId++,
      identifier: '+959987654321',
      identifier_type: 'phone',
      password_hash: passwordHash,
      status: 'active',
      created_at: new Date(),
    };
    this.users.push(player);
    this.roles.set(player.id, 'user');
    this.wallets.set(player.id, {
      user_id: player.id,
      balance_mmk: 100000,
      updated_at: new Date(),
    });
    this.ledger.push({
      id: this.nextLedgerId++,
      user_id: player.id,
      bet_id: null,
      kind: 'adjustment',
      amount_mmk: 100000,
      balance_after_mmk: 100000,
      reference_key: `init:player:${player.id}`,
      created_at: new Date(),
    });

    // Default email admin (admin@azlottery.com)
    const admin: UserRecord = {
      id: this.nextUserId++,
      identifier: 'admin@azlottery.com',
      identifier_type: 'email',
      password_hash: passwordHash,
      status: 'active',
      created_at: new Date(),
    };
    this.users.push(admin);
    this.roles.set(admin.id, 'admin');
    this.wallets.set(admin.id, {
      user_id: admin.id,
      balance_mmk: 500000,
      updated_at: new Date(),
    });

    // Default phone admin (+959123456789 / 09123456789)
    const phoneAdmin: UserRecord = {
      id: this.nextUserId++,
      identifier: '+959123456789',
      identifier_type: 'phone',
      password_hash: passwordHash,
      status: 'active',
      created_at: new Date(),
    };
    this.users.push(phoneAdmin);
    this.roles.set(phoneAdmin.id, 'admin');
    this.wallets.set(phoneAdmin.id, {
      user_id: phoneAdmin.id,
      balance_mmk: 500000,
      updated_at: new Date(),
    });

    // Providers
    this.providers = [
      { code: 'kbz', name: 'KBZPay', receiver_phone: '09987654321', receiver_name: 'AzLottery Official', status: 'active', updated_at: new Date() },
      { code: 'wave', name: 'WavePay', receiver_phone: '09876543210', receiver_name: 'AzLottery Pay', status: 'active', updated_at: new Date() },
      { code: 'aya', name: 'AYA Pay', receiver_phone: '09776543210', receiver_name: 'AzLottery Pay', status: 'active', updated_at: new Date() },
      { code: 'cb', name: 'CB Pay', receiver_phone: '09665432109', receiver_name: 'AzLottery Pay', status: 'active', updated_at: new Date() },
    ];
  }

  async execute(sql: string, params: any[] = []): Promise<[any[], any]> {
    const trimmed = sql.trim().replace(/\s+/g, ' ');

    // 0. Login attempt throttle check
    if (/FROM azlottery_login_attempts/i.test(trimmed)) {
      return [[], []]; // Not blocked
    }
    if (/INTO azlottery_login_attempts/i.test(trimmed) || /DELETE FROM azlottery_login_attempts/i.test(trimmed)) {
      return [[], []];
    }

    // 1. Session lookup
    if (/SELECT u\.id, u\.identifier, u\.identifier_type, u\.created_at/i.test(trimmed)) {
      const tokenHash = params[0];
      const session = this.sessions.find((s) => s.token_hash === tokenHash && s.expires_at > new Date());
      if (!session) return [[], []];
      const user = this.users.find((u) => u.id === session.user_id && u.status === 'active');
      if (!user) return [[], []];
      const role = this.roles.get(user.id) || 'user';
      return [[{
        id: String(user.id),
        identifier: user.identifier,
        identifier_type: user.identifier_type,
        created_at: user.created_at,
        role,
      }], []];
    }

    // 2. User lookup by identifier
    if (/SELECT id, identifier, identifier_type, password_hash, status FROM azlottery_users WHERE identifier =/i.test(trimmed)) {
      const ident = normalizeIdent(String(params[0]));
      const user = this.users.find((u) => normalizeIdent(u.identifier) === ident);
      if (!user) return [[], []];
      return [[{
        id: String(user.id),
        identifier: user.identifier,
        identifier_type: user.identifier_type,
        password_hash: user.password_hash,
        status: user.status,
      }], []];
    }

    // 3. User registration insert
    if (/INSERT INTO azlottery_users/i.test(trimmed)) {
      const [ident, type, pwdHash] = params;
      const normalized = normalizeIdent(String(ident));
      const existing = this.users.find((u) => normalizeIdent(u.identifier) === normalized);
      if (existing) {
        const err: any = new Error('Duplicate entry');
        err.code = 'ER_DUP_ENTRY';
        throw err;
      }
      const newUser: UserRecord = {
        id: this.nextUserId++,
        identifier: String(ident),
        identifier_type: type,
        password_hash: String(pwdHash),
        status: 'active',
        created_at: new Date(),
      };
      this.users.push(newUser);
      this.roles.set(newUser.id, 'user');
      this.wallets.set(newUser.id, {
        user_id: newUser.id,
        balance_mmk: 100000, // 100,000 MMK starter balance for betting!
        updated_at: new Date(),
      });
      this.ledger.push({
        id: this.nextLedgerId++,
        user_id: newUser.id,
        bet_id: null,
        kind: 'adjustment',
        amount_mmk: 100000,
        balance_after_mmk: 100000,
        reference_key: `init:${newUser.id}`,
        created_at: new Date(),
      });
      return [[{ insertId: newUser.id }], []];
    }

    // 4. Session insert
    if (/INSERT INTO azlottery_sessions/i.test(trimmed)) {
      const [userId, tokenHash] = params;
      const sRecord: SessionRecord = {
        id: this.nextSessionId++,
        user_id: Number(userId),
        token_hash: String(tokenHash),
        expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        created_at: new Date(),
      };
      this.sessions.push(sRecord);
      return [[{ insertId: sRecord.id }], []];
    }

    // 5. Session delete
    if (/DELETE FROM azlottery_sessions WHERE token_hash =/i.test(trimmed)) {
      const hash = params[0];
      this.sessions = this.sessions.filter((s) => s.token_hash !== hash);
      return [[], []];
    }

    // 6. User role lookup
    if (/SELECT role FROM azlottery_user_roles WHERE user_id =/i.test(trimmed)) {
      const uId = Number(params[0]);
      const role = this.roles.get(uId) || 'user';
      return [[{ role }], []];
    }

    // 7. Insert ignore / ensure wallet
    if (/INSERT INTO azlottery_wallets/i.test(trimmed) || /INSERT IGNORE INTO azlottery_wallets/i.test(trimmed)) {
      const uId = Number(params[0]);
      if (!this.wallets.has(uId)) {
        this.wallets.set(uId, { user_id: uId, balance_mmk: 100000, updated_at: new Date() });
      }
      return [[], []];
    }

    // 8. Select wallet balance
    if (/SELECT balance_mmk FROM azlottery_wallets WHERE user_id =/i.test(trimmed)) {
      const uId = Number(params[0]);
      let w = this.wallets.get(uId);
      if (!w) {
        w = { user_id: uId, balance_mmk: 100000, updated_at: new Date() };
        this.wallets.set(uId, w);
      }
      return [[{ balance_mmk: w.balance_mmk }], []];
    }

    // 9. Update wallet balance
    if (/UPDATE azlottery_wallets SET balance_mmk =/i.test(trimmed)) {
      const [bal, uId] = params;
      const w = this.wallets.get(Number(uId));
      if (w) {
        w.balance_mmk = Number(bal);
        w.updated_at = new Date();
      } else {
        this.wallets.set(Number(uId), { user_id: Number(uId), balance_mmk: Number(bal), updated_at: new Date() });
      }
      return [[], []];
    }

    // 10. Reserved balance lookup
    if (/SELECT COALESCE\(SUM\(amount_mmk\), 0\) AS reserved_mmk FROM azlottery_payment_requests/i.test(trimmed)) {
      const uId = Number(params[0]);
      const reserved = this.requests
        .filter((r) => r.user_id === uId && r.kind === 'withdrawal' && r.status === 'pending')
        .reduce((sum, r) => sum + (r.amount_mmk || 0), 0);
      return [[{ reserved_mmk: reserved }], []];
    }

    // 11. Payment requests list
    if (/SELECT id, kind, status, phone, transfer_id, amount_mmk, provider_code/i.test(trimmed)) {
      const uId = Number(params[0]);
      const rows = this.requests
        .filter((r) => r.user_id === uId)
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
        .map((r) => ({
          id: r.id,
          kind: r.kind,
          status: r.status,
          phone: r.phone,
          transfer_id: r.transfer_id,
          amount_mmk: r.amount_mmk,
          provider_code: r.provider_code,
          payout_reference: r.payout_reference,
          admin_note: r.admin_note,
          created_at: r.created_at,
        }));
      return [rows, []];
    }

    // 12. Insert payment request
    if (/INSERT INTO azlottery_payment_requests/i.test(trimmed)) {
      const reqId = this.nextRequestId++;
      let newReq: PaymentRequestRecord;
      if (params.length === 5) {
        newReq = {
          id: reqId,
          user_id: Number(params[0]),
          kind: 'deposit',
          phone: String(params[1]),
          transfer_id: String(params[2]),
          amount_mmk: params[3] ? Number(params[3]) : null,
          status: 'pending',
          created_at: new Date(),
        };
      } else {
        newReq = {
          id: reqId,
          user_id: Number(params[0]),
          kind: 'withdrawal',
          amount_mmk: Number(params[1]),
          phone: String(params[2]),
          status: 'pending',
          created_at: new Date(),
        };
      }
      this.requests.unshift(newReq);
      return [[{ insertId: reqId }], []];
    }

    // 13. Ledger list
    if (/SELECT id, user_id, kind, amount_mmk, balance_after_mmk, reference_key, created_at FROM azlottery_wallet_ledger/i.test(trimmed)) {
      const uId = Number(params[0]);
      const rows = this.ledger
        .filter((l) => l.user_id === uId)
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      return [rows, []];
    }

    // 14. Insert ledger
    if (/INSERT INTO azlottery_wallet_ledger/i.test(trimmed)) {
      const lId = this.nextLedgerId++;
      let uId = Number(params[0]);
      let betId = null;
      let kind = 'adjustment';
      let amount = 0;
      let balAfter = 0;
      let refKey = `ref:${lId}`;

      if (params.length >= 6) {
        uId = Number(params[0]);
        betId = params[1] ? Number(params[1]) : null;
        kind = String(params[2]);
        amount = Number(params[3]);
        balAfter = Number(params[4]);
        refKey = String(params[5]);
      } else if (params.length === 5) {
        uId = Number(params[0]);
        kind = String(params[1]);
        amount = Number(params[2]);
        balAfter = Number(params[3]);
        refKey = String(params[4]);
      }

      this.ledger.unshift({
        id: lId,
        user_id: uId,
        bet_id: betId,
        kind,
        amount_mmk: amount,
        balance_after_mmk: balAfter,
        reference_key: refKey,
        created_at: new Date(),
      });
      return [[{ insertId: lId }], []];
    }

    // 15. Providers list
    if (/SELECT code, name, receiver_phone, receiver_name, status FROM azlottery_payment_providers/i.test(trimmed)) {
      return [this.providers.filter((p) => p.status === 'active'), []];
    }

    // 16. Admin review request
    if (/UPDATE azlottery_payment_requests/i.test(trimmed)) {
      return [[], []];
    }

    // Admin users count
    if (/COUNT\(\*\) AS totalUsers/i.test(trimmed) || /SELECT COUNT\(\*\)/i.test(trimmed)) {
      return [[{ totalUsers: this.users.length, total: this.users.length }], []];
    }

    // Admin pending deposits
    if (/kind = 'deposit' AND status = 'pending'/i.test(trimmed)) {
      const count = this.requests.filter((r) => r.kind === 'deposit' && r.status === 'pending').length;
      return [[{ count }], []];
    }

    // Admin pending withdrawals
    if (/kind = 'withdrawal' AND status = 'pending'/i.test(trimmed)) {
      const count = this.requests.filter((r) => r.kind === 'withdrawal' && r.status === 'pending').length;
      return [[{ count }], []];
    }

    // Admin users list
    if (/FROM azlottery_users u/i.test(trimmed)) {
      const list = this.users.map((u) => {
        const w = this.wallets.get(u.id);
        const bal = w ? w.balance_mmk : 0;
        return {
          id: String(u.id),
          identifier: u.identifier,
          identifier_type: u.identifier_type,
          status: u.status,
          created_at: u.created_at,
          balance_mmk: bal,
        };
      });
      return [list, []];
    }

    // Default fallback: empty result
    return [[], []];
  }

  getConnection(): Promise<PoolConnection> {
    const conn: any = {
      execute: (sql: string, params: any[] = []) => this.execute(sql, params),
      query: (sql: string, params: any[] = []) => this.execute(sql, params),
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      release: () => {},
    };
    return Promise.resolve(conn as PoolConnection);
  }
}

declare global {
  var azLotteryMockDbInstance: MockDatabase | undefined;
}

export function getMockDbPool(): Pool {
  if (!globalThis.azLotteryMockDbInstance) {
    globalThis.azLotteryMockDbInstance = new MockDatabase();
  }
  return globalThis.azLotteryMockDbInstance as unknown as Pool;
}
