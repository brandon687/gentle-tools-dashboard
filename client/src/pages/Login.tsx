import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function Login() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const error = searchParams.get('error');

  const handleGoogleLogin = () => {
    // Redirect to Google OAuth
    window.location.href = '/auth/google';
  };

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'auth_failed':
        return 'Authentication failed. Please try again.';
      case 'unauthorized':
        return 'You are not authorized to access this application.';
      case 'domain_not_allowed':
        return 'Only @scalmob.com email addresses are allowed.';
      default:
        return 'An error occurred during login. Please try again.';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-2xl border-slate-700">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold">Gentle Tools Dashboard</CardTitle>
            <CardDescription className="text-base mt-2">
              Inventory Management System
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {getErrorMessage(error)}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="text-center text-sm text-slate-400">
              Sign in with your Scalmob account to continue
            </div>

            <Button
              onClick={handleGoogleLogin}
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </Button>
          </div>

          <div className="pt-4 border-t border-slate-700">
            <div className="text-xs text-slate-500 text-center space-y-1">
              <p>Restricted to @scalmob.com accounts only</p>
              <p className="text-slate-600">Contact your administrator for access</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
