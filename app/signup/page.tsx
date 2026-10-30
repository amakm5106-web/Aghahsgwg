import type { Metadata } from 'next';
import { AuthScreen } from '@/components/AuthScreen';

export const metadata: Metadata = {
  title: 'AzLottery | စာရင်းသွင်းရန်',
  description: 'ဖုန်းနံပါတ် သို့မဟုတ် အီးမေးလ်နှင့် စကားဝှက်ဖြင့် AzLottery အကောင့်ဖွင့်ပါ။',
};

export default function SignupPage() {
  return <AuthScreen mode="signup" />;
}
