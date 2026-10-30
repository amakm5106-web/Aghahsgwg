import type { Metadata } from 'next';
import { AuthScreen } from '@/components/AuthScreen';

export const metadata: Metadata = {
  title: 'AzLottery | အကောင့်ဝင်ရန်',
  description: 'AzLottery အကောင့်သို့ ဖုန်းနံပါတ် သို့မဟုတ် အီးမေးလ်နှင့် စကားဝှက်ဖြင့် ဝင်ရောက်ပါ။',
};

export default function LoginPage() {
  return <AuthScreen mode="login" />;
}
