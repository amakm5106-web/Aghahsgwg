CREATE TABLE IF NOT EXISTS azlottery_wallets (
  user_id BIGINT UNSIGNED NOT NULL,
  balance_mmk BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_azlottery_wallets_user FOREIGN KEY (user_id)
    REFERENCES azlottery_users (id) ON DELETE CASCADE,
  CONSTRAINT chk_azlottery_wallets_balance_nonnegative CHECK (balance_mmk >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS azlottery_game_rounds (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  game_code ENUM('k3', '5d', 'trx') NOT NULL,
  period_id VARCHAR(64) NOT NULL,
  interval_minutes SMALLINT UNSIGNED NOT NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  result_value VARCHAR(32) NULL,
  status ENUM('open', 'settled') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  settled_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_azlottery_game_round (game_code, period_id),
  KEY ix_azlottery_game_round_lookup (game_code, interval_minutes, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS azlottery_game_bets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  round_id BIGINT UNSIGNED NOT NULL,
  selection VARCHAR(32) NOT NULL,
  stake_mmk BIGINT UNSIGNED NOT NULL,
  payout_mmk BIGINT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('pending', 'won', 'lost', 'cancelled') NOT NULL DEFAULT 'pending',
  idempotency_key CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  settled_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_azlottery_game_bet_idempotency (user_id, idempotency_key),
  KEY ix_azlottery_game_bet_round (round_id, status),
  CONSTRAINT fk_azlottery_game_bets_user FOREIGN KEY (user_id)
    REFERENCES azlottery_users (id) ON DELETE CASCADE,
  CONSTRAINT fk_azlottery_game_bets_round FOREIGN KEY (round_id)
    REFERENCES azlottery_game_rounds (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS azlottery_wallet_ledger (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  bet_id BIGINT UNSIGNED NULL,
  kind ENUM('game_stake', 'game_payout', 'deposit', 'withdrawal', 'adjustment') NOT NULL,
  amount_mmk BIGINT NOT NULL,
  balance_after_mmk BIGINT NOT NULL,
  reference_key VARCHAR(128) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_azlottery_wallet_ledger_reference (user_id, reference_key),
  KEY ix_azlottery_wallet_ledger_user_time (user_id, created_at),
  CONSTRAINT fk_azlottery_wallet_ledger_user FOREIGN KEY (user_id)
    REFERENCES azlottery_users (id) ON DELETE CASCADE,
  CONSTRAINT fk_azlottery_wallet_ledger_bet FOREIGN KEY (bet_id)
    REFERENCES azlottery_game_bets (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
