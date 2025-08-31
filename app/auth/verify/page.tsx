'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { completeSignIn } from '@/lib/auth';

function AuthVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifySignIn = async () => {
      try {
        const url = window.location.href;
        const email = window.localStorage.getItem('emailForSignIn');
        
        const result = await completeSignIn(email, url);
        
        if (result.success) {
          toast.success('サインイン成功しました！');
          // Redirect to the previous page or home
          const returnUrl = searchParams.get('returnUrl') || '/';
          router.push(returnUrl);
        } else {
          setError(result.error || 'サインインに失敗しました');
        }
      } catch (error) {
        console.error('Error during sign-in verification:', error);
        setError('サインインの確認に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    verifySignIn();
  }, [router, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>サインインを確認しています</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p>サインインを確認しています...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>サインインエラー</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-red-600">{error}</p>
            <Button 
              onClick={() => router.push('/')} 
              className="w-full"
            >
              ホームに戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>サインイン成功</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center">リダイレクトしています...</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>読み込んでいます...</CardTitle>
          </CardHeader>
          <CardContent>
            <p>読み込んでいます...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <AuthVerifyContent />
    </Suspense>
  );
}