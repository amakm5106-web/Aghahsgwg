# AzLottery ဝဘ်ဆိုဒ် — အကောင်အထည်ဖော်ရေးအစီအစဉ်

## ရည်ရွယ်ချက်နှင့် အကန့်အသတ်များ

ပေးထားသော `AzLottery-agent-referral-fixed.zip` ကိုဖြည်ပြီး ပါဝင်သည့် AzLottery source၊ အကြောင်းအရာနှင့် asset များကို ဆက်လက်အသုံးပြုမည်။ မူရင်းတောင်းဆိုချက်မှာ “ဒီ zip ကိုဖြည်ပြီး Website build ပါ localstroage မသုံးရ” ဖြစ်သဖြင့် browser `localStorage` နှင့် `sessionStorage` ကို application code တွင် မသုံးပါ။ Session ကို server ရှိ httpOnly cookie နှင့် `/api/auth/session` မှပြန်လည်ဖတ်မည်။ ရေရှည်တည်မြဲရမည့် user, wallet, payment request, transaction ledger နှင့် referral data များကို managed MySQL တွင်သိမ်းမည်။

ရှိပြီးသား Next.js App Router, TypeScript, React, `mysql2`, user-provided asset များနှင့် authentication schema ကို ဆက်သုံးမည်။ Referral dashboard တွင် user တစ်ဦးချင်း code/link, အဆင့် ၁–၆ အဖွဲ့၊ privacy-safe member identifier၊ activity နှင့် မှတ်တမ်းတင်ထားသော commission ကိုသာပြမည်။ အမှန်တကယ်မရှိသည့် member သို့မဟုတ် commission ကို မဖန်တီးပါ။

Admin Dashboard ကို authenticated email `primren685@gmail.com` တစ်ခုတည်းအတွက် server-side allowlist ဖြင့် ခွင့်ပြုမည်။ Account page မှ link၊ `/admin`, `#admin` နှင့် admin API များအားလုံးသည် session server မှပေးသော role ကို စစ်ဆေးမည်။ Client-side role ပြောင်းခြင်းဖြင့် ဝင်ရောက်ခွင့်ရမည်မဟုတ်ပါ။

## အမှန်တကယ် wallet နှင့် ငွေလွှဲလုပ်ငန်းစဉ်

ရှိပြီးသား `azlottery_wallets` နှင့် `azlottery_wallet_ledger` ကို ငွေလက်ကျန်နှင့် စာရင်းမှတ်တမ်း၏ တစ်ခုတည်းသော အမှန်တကယ်ရင်းမြစ်အဖြစ် အသုံးပြုမည်။ ထပ်ဖြည့်သော migration သည် ငွေလွှဲတောင်းဆိုမှုနှင့် Admin မှ စီမံမည့် လက်ခံအကောင့်ဇယားများကို ဖန်တီးမည်။ `reserved_mmk` ကို သီးခြား wallet column အဖြစ်မသိမ်းဘဲ ဆိုင်းငံ့နေသော ငွေထုတ်တောင်းဆိုမှုများမှ ပေါင်းတွက်မည်။ Database row lock နှင့် transaction ကို အသုံးပြုပြီး လက်ကျန်ထက်ကျော်၍ ထုတ်ယူခြင်းမဖြစ်စေရန် ထိန်းချုပ်မည်။ Production database ရှိ ရှိပြီးသားအချက်အလက်ကို မဖျက်သကဲ့သို့ စမ်းသပ်ရန်အတွက် ငွေကြေးစာရင်းသွင်းမှုလည်း မထည့်ပါ။

ငွေသွင်းပုံစံတွင် **ဖုန်းနံပါတ်နှင့် ငွေလွှဲ ID** နှစ်ခုကိုသာ တောင်းမည်။ ငွေပမာဏ၊ ပြေစာစာသား၊ အမည် သို့မဟုတ် ငွေပေးချေမှုနည်းလမ်းကို မတောင်းပါ။ တောင်းဆိုချက်အသစ်ကို စစ်ဆေးဆဲအဖြစ် သိမ်းဆည်းမည်။ ငွေလွှဲ ID ထပ်နေပါက ပယ်ချမည်။ Admin က ပြင်ပငွေလွှဲစာရင်းနှင့် တိုက်စစ်ပြီး အတည်ပြုထားသော MMK ပမာဏ ထည့်ကာ အတည်ပြုမှသာ wallet ထဲသို့ ငွေဖြည့်မည်။

ငွေထုတ်ရန် user သည် ပမာဏနှင့် လက်ခံမည့်ဖုန်းနံပါတ်ကို ထည့်သွင်းမည်။ Server သည် transaction နှင့် row lock သုံး၍ `balance_mmk - reserved_mmk` ကိုစစ်ဆေးပြီး pending ပမာဏကို reserve လုပ်မည်။ Admin သည် ပြင်ပမှ အမှန်တကယ်ငွေလွှဲပြီး payout reference ထည့်ကာ အတည်ပြုပြီးမှသာ wallet လက်ကျန်နှင့် ledger ကို update လုပ်မည်။ ပယ်ချပါက reserve ကို တစ်ကြိမ်တည်း ပြန်လွှတ်ပြီး စာရင်းမှတ်တမ်း ထည့်မည်။ ငွေပမာဏများကို integer MMK ဖြင့် ကိုင်တွယ်ကာ database transaction၊ user ပိုင်ဆိုင်မှုစစ်ဆေးချက်နှင့် ထပ်ခါတလဲလဲတင်သွင်းမှုကာကွယ်ချက်များ အသုံးပြုမည်။

Admin ငွေကြေး Dashboard သည် user စာရင်း၊ စစ်ဆေးဆဲ/အတည်ပြုပြီး/ပယ်ချထားသော request များ၊ wallet စုစုပေါင်းလက်ကျန်၊ reserve၊ အတည်ပြုထားသော ငွေသွင်း/ငွေထုတ်ပမာဏနှင့် နောက်ဆုံး ledger မှတ်တမ်းများကို managed database မှ ဖတ်ပြမည်။ ငွေလက်ခံအကောင့်ဖုန်းနံပါတ်များကို Admin က database မှ စီမံနိုင်မည်။ Payment provider credential များ မပေးထားသဖြင့် ငွေလွှဲခြင်းနှင့် စစ်ဆေးခြင်းသည် လူကိုယ်တိုင် ဆောင်ရွက်ရမည်။ အလိုအလျောက်ပို့ပြီးပြီ သို့မဟုတ် အလိုအလျောက်အတည်ပြုပြီးပြီဟု မဆိုပါ။ အရင် mock အလိုအလျောက်စစ်ဆေးခြင်းနှင့် အတုအယောင် payout လမ်းကြောင်းများကို ပိတ်ထားမည်။

ရှိပြီးသား game UI callback များသည် client-side ကျပန်းရလဒ် သို့မဟုတ် memory ထဲရှိလက်ကျန်ကို အသုံးပြုပြီး အမှန်တကယ် wallet ကို မပြောင်းလဲစေရပါ။ Server ဘက်မှ တရားဝင်ရလဒ်နှင့် audit စနစ်ကို သေချာမချိတ်ဆက်မချင်း ငွေပါသောဂိမ်းများကို ယာယီပိတ်ထားမည်။ အတုအယောင် ငွေဖြတ်ခြင်း/ဆုငွေထည့်ခြင်းကို အမှန်တကယ် wallet စာရင်းနှင့် မရောစေရပါ။

## Architecture နှင့် data flow

- **Frontend:** `/`, `/admin`, `/login`, `/signup`; wallet သည် server summary/request API ကို fetch လုပ်ပြီး Activity သည် ledger ကိုပြမည်။ Referral link သည် `/signup?invite=...` ဖြစ်မည်။
- **Authentication:** `/api/auth/*` မှ server session ကိုစစ်ဆေးမည်; write endpoint များတွင် same-origin/JSON validation နှင့် authenticated ownership ကိုစစ်မည်။
- **Wallet APIs:** authenticated user အတွက် summary၊ request list နှင့် request create; admin allowlist အတွက် financial summary၊ user/request/provider list နှင့် review/config actions.
- **Database:** `migrations/001_auth.sql`, `002_games.sql`, `003_agent_referrals.sql` နှင့် additive finance migration များ; runner သည် `DATABASE_URL` မှ versioned SQL များကိုအသုံးချမည်။ Managed DB သည် dev/test/publish အတွက် တူညီနိုင်သဖြင့် customer record များကို test မလုပ်ပါ။
- **Client state:** React memory state သာသုံးမည်။ Authentication/session၊ wallet balance၊ request နှင့် ledger ကို API မှပြန်လည်ရယူမည်; browser storage မသုံးပါ။

## Project structure

- `app/` — main/admin/login/signup pages၊ auth/referral/wallet/admin API routes၊ styles နှင့် route manifest.
- `components/` — ZIP မှရသော AzLottery views; WalletView သည် pending request နှင့် admin-configured receiver ကိုပြမည်; Admin finance dashboard သ нь DB-ээс fetch လုပ်မည်.
- `lib/auth/` — MySQL pool၊ session cookie၊ allowlist role၊ same-origin guard.
- `lib/referrals/` — invitation code၊ team relationship/activity၊ identifier masking.
- `lib/wallet/` — amount/phone validation၊ ledger descriptions နှင့် server-side wallet helper များ.
- `lib/store.ts` — session hydration နှင့် server wallet data ကို UI state သို့ချိတ်ဆက်ရန်; fake deposit/withdraw approval မရှိ.
- `migrations/`, `scripts/` — versioned auth/game/referral/finance schema နှင့် migration runner.
- `public/` — supplied visual assets နှင့် `/manus-routes.json`.
- `test/` — auth, referral, financial state-transition helper များအတွက် unit tests.

## အတည်ပြုပြီးသောဒီဇိုင်း — Lucky Ledger

- **Design Movement:** ရိုးရာ lottery ticket နှင့် စာရင်းစာအုပ် motif ကို AzLottery dashboard ပုံစံဖြင့်ခေတ်မီအောင် ပေါင်းစပ်မည်။
- **Core Principles:** နံပါတ်နှင့်စာရင်းကို ဖတ်ရလွယ်ခြင်း၊ ငွေကြေးအချက်အလက်ကို တိကျရိုးသားစွာပြခြင်း၊ ticket/perforation အမှတ်အသားကို တစ်သမတ်တည်းသုံးခြင်း၊ mobile action များကို လက်မဖြင့်လွယ်ကူစွာနှိပ်နိုင်ခြင်း။
- **Color Philosophy:** ပူနွေးသော paper surface ဖြင့် ledger ယုံကြည်မှု၊ deep burgundy ဖြင့် brand action၊ gold ကို result/ticket accent အတွက်သာ အသုံးပြုမည်။
- **Layout Paradigm:** Desktop တွင် ticket နှင့်အတူ information rail များ၊ mobile တွင် ဦးစားပေးအလိုက် card များတန်းစီမည်။
- **Signature Elements:** perforated ticket edge၊ gold-edged number chip၊ compact burgundy ticket-mark.
- **Interaction Philosophy:** copy/share feedback မြန်ဆန်မည်; loading/empty/error/pending အခြေအနေရှင်းလင်းမည်; ငွေစာရင်းကို DB မှသာပြမည်။
- **Animation:** တိုတောင်းသိမ်မွေ့သော fade/rise၊ `prefers-reduced-motion` ကို လေးစားပြီး confirmation ကို မနှောင့်ယှက်ပါ။
- **Typography:** Burmese heading အတွက် Noto Serif Myanmar၊ control အတွက် Noto Sans Myanmar/Padauk fallback၊ ငွေ/နံပါတ်များအတွက် tabular numerals.
- **Brand Essence:** မြန်မာ lottery player နှင့် agent များအတွက် result၊ referral နှင့် wallet records ကို ticket-ledger တစ်နေရာတည်းတွင်မြင်နိုင်သော experience; ယုံကြည်ရ၊ နွေးထွေး၊ တိကျ.
- **Brand Voice:** တိုတောင်းယဉ်ကျေးပြီး အချက်အလက်အခြေပြု Burmese copy. ဥပမာ — “သင့်ဖိတ်ခေါ်လင့်ခ်ကို ကူးယူပါ။”၊ “အဖွဲ့ဝင်မှတ်တမ်း မရှိသေးပါ။”
- **Wordmark & Logo:** ZIP မှ AzLottery brand asset ကိုပြန်သုံးပြီး compact ticket-stub A mark နှင့် gold-dot accent ကိုအသုံးပြုမည်။
- **Signature Brand Color:** `#7A1F2B`; supporting paper `#FBF7EF`, ledger gold `#E2B84B`.

## တင်ပို့မှုနှင့် hosting

Project-root `Dockerfile` ကိုသုံးပြီး pinned `pnpm@11.25.0` ဖြင့် install/build လုပ်မည်; standalone Next.js server သည် `PORT` ကိုလိုက်နာမည် (default 3000)။ `healthPath` သည် unauthenticated `/api/health` ဖြစ်သည်။ `publishing.auto_publish: true` ဖြစ်နေသောကြောင့် main checkpoint အသစ်တင်ပါက publish အလိုအလျောက်စနိုင်သည်။ User တောင်းထားသော source ZIP တွင် source၊ migration၊ assets၊ lockfile နှင့် deployment file များပါမည်; `.env`/credentials၊ `.git`၊ `node_modules`၊ `.next`၊ cache နှင့် generated output မပါရပါ။


## Game settlement safety

အရင် game UI များသည် client memory နှင့် random callback ကိုအသုံးပြုထားပြီး, user-facing game screen များက database game API ကိုမခေါ်သေးပါ။ ထို့ကြောင့် ငွေကြေးကို deposit/withdraw ledger နှင့် တစ်ပြိုင်နက်တည်းမထိန်းချုပ်နိုင်သေးချိန်တွင် game wager အတွက် client-side debit/credit မလုပ်ပါ။ Server-side outcome နှင့် audit ချိတ်ဆက်မှု သေချာပြီးမှ cash wager ကို သီးခြားဖွင့်မည်။
