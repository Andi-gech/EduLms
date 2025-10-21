import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { apiClient, isApiError } from '@/lib/apiClient';
import { saveAuth } from '@/lib/auth';
import { useNavigate } from 'react-router';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDepartments } from '@/hooks/useApiData';


export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {

  const [step, setStep] = useState(1);
  const { data: departments, isLoading: depsLoading, error: depsError } = useDepartments();
    const [fullName, setFullName] = useState("");
    const [fanNo, setFanNo] = useState("");
    const [department, setDepartment] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleNext = (e: React.FormEvent) => {
      e.preventDefault();
      if (!fullName || !fanNo ) {
        setError("Please fill all user information fields.");
        return;
      }
      setError("");
      setStep(2);
    };

    const navigate = useNavigate();

    const handleSignup = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email || !password || !confirmPassword) {
        setError("Please fill all authentication fields.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        // Call backend register
        await apiClient.register({ fullName, email, password, confirmpassword: confirmPassword, department, role: 'student' });
        // Auto-login after register
        const resp = await apiClient.login({ email, password });
        // Persist auth
        saveAuth({ token: resp.token, role: resp.role || null, name: resp.name || null, id: resp.id || null, department: resp.department || null, pic: resp.pic || null, email: resp.email || null });
        setSuccess('Signup successful! Redirecting...');
        setTimeout(() => navigate('/'), 800);
      } catch (err) {
        if (isApiError(err)) setError(err.message || 'Signup failed');
        else if (err instanceof Error) setError(err.message);
        else setError('Signup failed');
      } finally {
        setLoading(false);
      }
    };

    return (
      <form className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            {step === 1
              ? "Enter your information to continue"
              : "Set your email and password to finish registration"}
          </p>
        </div>
        {error && <div className="text-red-300 text-sm text-center">{error}</div>}
        {success && <div className="text-green-600 text-sm text-center">{success}</div>}
        <div className="grid gap-6">
          {step === 1 && (
            <>
              <div className="grid gap-3">
                <Label htmlFor="fullname">Full name</Label>
                <Input id="fullname" type="text" placeholder="abebe kebede" value={fullName} onChange={e => setFullName(e.target.value)} required />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="Fan">Fan No</Label>
                <Input id="Fan" type="text" placeholder="1234567890" value={fanNo} onChange={e => setFanNo(e.target.value)} required />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="department">Department</Label>
                <Select name="department" value={department} onValueChange={setDepartment} required disabled={depsLoading || !!depsError}>
                  <SelectTrigger id="department">
                    <SelectValue placeholder={depsLoading ? 'Loading...' : (depsError ? 'Failed to load' : 'Select department')} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.map(opt => (
                      <SelectItem key={opt._id} value={opt._id}>{opt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" className="w-full" onClick={handleNext}>
                Next
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="m@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={loading} onClick={handleSignup}>
                  {loading ? "Signing up..." : "Sign Up"}
                </Button>
              </div>
            </>
          )}
        </div>
        <div className="text-center text-sm">
          Already have an account?{" "}
          <a href="/login" className="underline underline-offset-4">
            Login
          </a>
        </div>
      </form>
    );
  }
