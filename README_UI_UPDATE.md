# AzLottery — စီမံခန့်ခွဲမှုနှင့် setup

## လုပ်ဆောင်ချက်များ

ဤ Next.js website သည် ပေးထားသော AzLottery source နှင့် assets ကို အခြေခံထားသည်။ Browser `localStorage`/`sessionStorage` ကို app data အတွက်မသုံးဘဲ account session၊ wallet နှင့် ledger ကို server/API/managed MySQL မှရယူသည်။

Admin Dashboard သည် server-side allowlist ဖြင့် `primren685@gmail.com` account အတွက်သာ ဖွင့်ပေးသည်။ Finance dashboard တွင် users၊ wallet totals၊ request queue၊ transaction ledger နှင့် admin မှ စီမံနိုင်သော ငွေလက်ခံအကောင့်များ ပါဝင်သည်။

Deposit form တွင် ဖုန်းနံပါတ်နှင့် ငွေလွှဲ ID နှစ်ခုသာ ထည့်ရသည်။ Request သည် pending ဖြစ်ပြီး Admin က ပြင်ပစာရင်းနှင့် တိုက်စစ်ပြီး အတည်ပြုထားသော MMK ပမာဏဖြည့်ကာ approve လုပ်မှသာ wallet balance တိုးသည်။ Withdrawal request တွင် amount နှင့် လက်ခံဖုန်းနံပါတ် ထည့်ရသည်။ စစ်ဆေးဆဲငွေကို reserve လုပ်ထားပြီး Admin က အမှန်တကယ်ငွေလွှဲကာ payout reference ဖြင့်အတည်ပြုမှ ledger/balance ကို ပြောင်းလဲသည်။ Provider API credential မရှိသောကြောင့် payout နှင့် transfer စစ်ဆေးခြင်းကို လက်ဖြင့်လုပ်ရသည်။ Admin သည် ငွေလက်ခံအကောင့်အမှန်ကို Dashboard ထဲတွင် configure လုပ်ရမည်။

တရားဝင် game-result source နှင့် server-side settlement မချိတ်ဆက်ရသေးသောကြောင့် ငွေပါသော game wager ကို ယာယီရပ်နားထားသည်။ Fake/random result မှ wallet credit/debit မလုပ်ပါ။

## Setup နှင့် build

- Node.js `22.23.4` နှင့် pnpm `11.25.0` ကို အသုံးပြုပါ။
- Managed runtime တွင် `DATABASE_URL` ကို secret/environment အဖြစ် configure လုပ်ပါ။ Secret ကို source, ZIP သို့မဟုတ် build-time client bundle တွင် မထည့်ပါနှင့်။
- `pnpm install`
- `pnpm db:migrate` — additive migration များကို apply လုပ်ရန်.
- `pnpm exec tsc --noEmit`
- `pnpm test`
- `pnpm build`

Finance migration သည် `azlottery_payment_requests` နှင့် `azlottery_payment_providers` ဇယားများကို ဖန်တီးသည်။ လက်ရှိ project database ကို development နှင့် publish တွင် မျှဝေနိုင်သောကြောင့် စမ်းသပ်ရန် ငွေကြေး transaction မထည့်ပါနှင့်။

## Routes

- `/` — AzLottery main website, wallet, Activity, referral နှင့် user pages
- `/admin` — allowlisted account အတွက် Admin finance dashboard
- `/login` — account sign-in
- `/signup` — account registration နှင့် referral invitation
- `/api/health` — container readiness

Production container သည် standalone Next.js server ကို `PORT` (default `3000`) ဖြင့် run လုပ်သည်။ Root `Dockerfile` သည် checked-in pnpm lockfile ကို အသုံးပြုသည်။