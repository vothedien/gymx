'use client';

import React, { useMemo, useState, useEffect } from "react";
import { MotionConfig, motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Check, Dumbbell, LogIn, Menu, Receipt, ShieldCheck, Star, TrendingUp, User, Wallet, Calendar, Clock,
} from "lucide-react";

// ---- Types & helpers
type Plan = { id: string; name: string; price: number; period: string; perks?: string[]; popular?: boolean };
export type InvoiceRow = { id: string; plan: string; amount: number; method: string; createdAt: string; status: string };
const formatVND = (n: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

const CLASSES = [
  { id: 1, name: "HIIT Burn", day: "Thứ 2, 4, 6", time: "18:00 - 19:00", coach: "Linh PT" },
  { id: 2, name: "Yoga Flow", day: "Thứ 3, 5", time: "07:00 - 08:00", coach: "An Yoga" },
  { id: 3, name: "Boxing", day: "Thứ 7", time: "09:00 - 10:30", coach: "Khoa Coach" },
];

export default function GymX() {
  const router = useRouter();
  const [isAuth, setIsAuth] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [history, setHistory] = useState<InvoiceRow[]>([]);

  const activePlan = useMemo(() => (isAuth ? "Pro" : null), [isAuth]);

  // Auth session + listener
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      setIsAuth(!!uid);
    };
    init();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      setIsAuth(!!uid);
    });
    return () => { sub?.subscription.unsubscribe(); };
  }, []);

  // Load plans
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from('plans').select('*').order('price');
      if (!error && data) setPlans(data as Plan[]);
    };
    load();
  }, []);

  // Load invoices sau khi login
  useEffect(() => {
    if (!userId) { setHistory([]); return; }
    const loadInv = async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, plan_id, amount, method, status, created_at, plans(name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error && data) {
        type InvoiceQueryRow = {
          id: string;
          plan_id: string;
          amount: number;
          method?: string | null;
          status?: string | null;
          created_at: string;
          plans?: { name?: string | null } | null;
        };
        const mapped = (data as InvoiceQueryRow[]).map((r) => ({
          id: r.id,
          plan: r.plans?.name ?? r.plan_id,
          amount: r.amount,
          method: r.method ?? 'MOMO',
          status: r.status ?? 'Hoàn tất',
          createdAt: new Date(r.created_at).toISOString().slice(0,16).replace('T',' '),
        }));
        setHistory(mapped);
      }
    };
    loadInv();
  }, [userId]);

  const handlePurchase = (planId: string) => {
    if (!isAuth || !userId) { setShowLogin(true); setSelectedPlan(planId); return; }
    const plan = plans.find((p) => p.id === planId);
    if (!plan) { alert("Gói không tồn tại"); return; }
    router.push(`/checkout?planId=${planId}`);
  };




  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
        <SiteHeader
          isAuth={isAuth}
          onLogin={() => { setAuthMode("login"); setShowLogin(true); }}
          onSignup={() => { setAuthMode("signup"); setShowLogin(true); }}
          onLogout={async () => {
            const { error } = await supabase.auth.signOut();
            if (error) alert(error.message);
            setIsAuth(false);
          }}
        />

        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Hero />

          <section id="about" className="py-12 sm:py-16">
            <AboutGym />
          </section>

          <section id="pricing" className="py-12 sm:py-16">
            <Pricing plans={plans} onSelect={(id) => handlePurchase(id)} highlightId="pro" />
          </section>

          <section id="classes" className="py-12 sm:py-16">
            <Classes />
          </section>

          <section id="coaches" className="py-12 sm:py-16">
            <Coaches />
          </section>

          {isAuth && (
            <section id="dashboard" className="py-12 sm:py-16">
              <Dashboard activePlan={activePlan} history={history} />
            </section>
          )}
        </main>

        <SiteFooter />

        <AuthDialog
          open={showLogin}
          initialMode={authMode}
          onOpenChange={(v)=>{ setShowLogin(v); }}
          onSuccess={async () => {
            const { data } = await supabase.auth.getSession();
            const uid = data.session?.user?.id ?? null;
            setUserId(uid);
            setIsAuth(!!uid);
            if (selectedPlan) setTimeout(() => handlePurchase(selectedPlan), 200);
          }}
        />
      </div>
    </MotionConfig>
  );
}

function SiteHeader({ isAuth, onLogin, onSignup, onLogout }: {
  isAuth: boolean; onLogin: () => void; onSignup: () => void; onLogout: () => void
}) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Dumbbell className="h-6 w-6" />
          <span className="font-semibold tracking-tight">GymX</span>
        </div>

        <nav className="hidden gap-6 text-sm font-medium sm:flex">
          <a href="#about" className="hover:opacity-80">Giới thiệu</a>
          <a href="#pricing" className="hover:opacity-80">Gói tập</a>
          <a href="#classes" className="hover:opacity-80">Lịch lớp</a>
          <a href="#coaches" className="hover:opacity-80">HLV</a>
          <a href="#dashboard" className="hover:opacity-80">Tài khoản</a>
        </nav>

        <div className="flex items-center gap-2">
          {isAuth ? (
            <Button variant="secondary" onClick={onLogout}><User className="mr-2 h-4 w-4" />Đăng xuất</Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button onClick={onLogin}><LogIn className="mr-2 h-4 w-4" />Đăng nhập</Button>
              <Button variant="outline" onClick={onSignup}>Đăng ký</Button>
            </div>
          )}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="sm:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription>Điều hướng nhanh</SheetDescription>
              </SheetHeader>
              <div className="mt-6 grid gap-4">
                {[
                  ["Giới thiệu", "#about"],
                  ["Gói tập", "#pricing"],
                  ["Lịch lớp", "#classes"],
                  ["HLV", "#coaches"],
                  ["Tài khoản", "#dashboard"],
                ].map(([label, href]) => (
                  <a key={href} href={href} className="rounded-xl border p-3 hover:bg-slate-50">{label}</a>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden pt-10 sm:pt-16">
      <div className="absolute inset-0 -z-10 opacity-30 [background-image:radial-gradient(50%_50%_at_50%_0%,#60a5fa_0%,transparent_60%)]" />
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8">
        <div>
          <motion.h1 initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }} className="text-3xl font-bold tracking-tight sm:text-5xl">
            Nâng tầm thể lực. <span className="text-blue-600">Sống khoẻ mỗi ngày.</span>
          </motion.h1>
          <p className="mt-4 text-slate-600">Phòng gym hiện đại với hệ thống máy LifeFitness, khu Functional, lớp GroupX và app theo dõi tiến độ luyện tập.</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button size="lg">Khám phá gói tập</Button>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <ShieldCheck className="h-4 w-4" />
              Cam kết hài lòng 7 ngày.
            </div>
          </div>
          <div className="mt-6 flex items-center gap-4">
            {["4.9/5 từ 2.1k đánh giá", "HLV chuẩn quốc tế", "Mở cửa 5:00 - 23:00"].map((t) => (
              <div key={t} className="flex items-center gap-2 text-sm text-slate-600">
                <Star className="h-4 w-4" />{t}
              </div>
            ))}
          </div>
        </div>
        <motion.div initial={{ scale: 0.98, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6, delay: 0.15 }} className="relative">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-3xl border shadow-xl">
            <img src="https://images.unsplash.com/photo-1558611848-73f7eb4001a1?q=80&w=1600&auto=format&fit=crop" alt="Gym hero" className="h-full w-full object-cover" />
          </div>
          <div className="absolute -bottom-6 left-6 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-lg">
            <TrendingUp className="h-5 w-5" />
            <div className="text-sm">+132 hội viên mới tháng này</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function AboutGym() {
  const items = [
    { icon: <Dumbbell className="h-5 w-5" />, title: "Thiết bị cao cấp", text: "Máy tập đa dạng, khu free-weight, functional & powerlifting." },
    { icon: <Calendar className="h-5 w-5" />, title: "Lịch lớp phong phú", text: "HIIT, Yoga, Boxing, Dance… 50+ lớp/tuần cho mọi cấp độ." },
    { icon: <Receipt className="h-5 w-5" />, title: "Minh bạch chi phí", text: "Thanh toán online, lưu hoá đơn, quản lý gói tập trong tài khoản." },
  ];
  return (
    <div className="grid items-center gap-8 lg:grid-cols-2">
      <div className="grid gap-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Vì sao chọn GymX?</h2>
        <p className="text-slate-600">Chúng tôi tập trung vào trải nghiệm: không gian rộng rãi, đội ngũ HLV nhiệt tình và hệ sinh thái số giúp bạn dễ dàng theo dõi và duy trì thói quen tập luyện.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((it) => (
            <Card key={it.title} className="rounded-2xl">
              <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                {it.icon}
                <CardTitle className="text-base">{it.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-slate-600">{it.text}</CardContent>
            </Card>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-3xl border shadow-xl">
        <img src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1600&auto=format&fit=crop" alt="About Gym" className="h-full w-full object-cover" />
      </div>
    </div>
  );
}

function Pricing({ plans, onSelect, highlightId }: { plans: Plan[]; onSelect: (id: string) => void; highlightId?: string }) {
  const fallbackPerks = ["Sử dụng phòng gym", "Theo dõi tiến độ", "Hỗ trợ HLV trực quầy"];
  return (
    <div>
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Gói tập linh hoạt</h2>
        <p className="mt-2 text-slate-600">Chọn gói phù hợp mục tiêu của bạn. Huỷ gia hạn bất kỳ lúc nào.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((p) => {
          const perks = Array.isArray(p.perks) && p.perks.length ? p.perks : fallbackPerks;
          return (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <Card className={`relative h-full rounded-3xl ${p.id === highlightId ? "border-blue-500 shadow-blue-100" : ""}`}>
                {p.popular && <Badge className="absolute right-3 top-3" variant="secondary">Phổ biến</Badge>}
                <CardHeader>
                  <CardTitle>{p.name}</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold">{formatVND(p.price)}</span>
                    <span className="text-slate-500"> / {p.period}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-2 text-sm text-slate-700">
                    {perks.map((perk) => (
                      <li key={perk} className="flex items-center gap-2"><Check className="h-4 w-4" />{perk}</li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" onClick={() => onSelect(p.id)}>Chọn gói {p.name}</Button>
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function Classes() {
  return (
    <div>
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Lịch lớp nổi bật</h2>
        <p className="mt-2 text-slate-600">Đăng ký tại quầy hoặc qua ứng dụng di động.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {CLASSES.map((c) => (
          <Card key={c.id} className="rounded-3xl">
            <CardHeader>
              <CardTitle>{c.name}</CardTitle>
              <CardDescription className="flex items-center gap-2 text-slate-600"><Clock className="h-4 w-4" />{c.day} • {c.time}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-slate-700">HLV: {c.coach}</CardContent>
            <CardFooter>
              <Button variant="secondary" className="w-full">Giữ chỗ</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Coaches() {
  const list = [
    { name: "Linh PT", role: "Strength & Conditioning", avatar: "https://images.unsplash.com/photo-1600486913747-55e0876a2b6b?q=80&w=800&auto=format&fit=crop" },
    { name: "An Yoga", role: "Yoga Alliance RYT-500", avatar: "https://images.unsplash.com/photo-1550525811-e5869dd03032?q=80&w=800&auto=format&fit=crop" },
    { name: "Khoa Coach", role: "Boxing & Conditioning", avatar: "https://images.unsplash.com/photo-1547721064-da6cfb341d50?q=80&w=800&auto=format&fit=crop" },
  ];
  return (
    <div>
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Đội ngũ HLV</h2>
        <p className="mt-2 text-slate-600">Kinh nghiệm, chứng chỉ đầy đủ, theo sát hành trình của bạn.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {list.map((u) => (
          <Card key={u.name} className="rounded-3xl">
            <CardHeader className="flex items-center text-center">
              <Avatar className="h-20 w-20">
                <AvatarImage src={u.avatar} alt={u.name} />
                <AvatarFallback>{u.name.split(" ").map((w) => w[0]).join("")}</AvatarFallback>
              </Avatar>
              <CardTitle className="mt-2">{u.name}</CardTitle>
              <CardDescription>{u.role}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Dashboard({ activePlan, history }: { activePlan: string | null; history: InvoiceRow[] }) {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Tài khoản của bạn</h2>
        <p className="mt-2 text-slate-600">Quản lý gói tập, hoá đơn và thông tin cá nhân.</p>
      </div>

      <Tabs defaultValue="membership" className="space-y-6">
        <TabsList>
          <TabsTrigger value="membership">Gói tập</TabsTrigger>
        </TabsList>

        <TabsContent value="membership">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Trạng thái gói</CardTitle>
              <CardDescription>Thông tin gói hiện tại và gia hạn.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-sm text-slate-500">Gói hiện tại</div>
                <div className="mt-1 text-lg font-semibold">{activePlan ?? "Chưa đăng ký"}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Ngày hết hạn</div>
                <div className="mt-1">{activePlan ? "10/11/2025" : "—"}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsList className="mt-6"><TabsTrigger value="billing">Lịch sử thanh toán</TabsTrigger><TabsTrigger value="profile">Hồ sơ</TabsTrigger></TabsList>

        <TabsContent value="billing">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Hoá đơn</CardTitle>
              <CardDescription>Toàn bộ giao dịch của bạn tại GymX.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>Nhấn vào mã hoá đơn để xem chi tiết (demo)</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã</TableHead>
                    <TableHead>Gói</TableHead>
                    <TableHead>Phương thức</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium text-blue-600">{h.id}</TableCell>
                      <TableCell>{h.plan}</TableCell>
                      <TableCell>{h.method}</TableCell>
                      <TableCell>{h.createdAt}</TableCell>
                      <TableCell className="text-right">{formatVND(h.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Thông tin cá nhân</CardTitle>
              <CardDescription>Cập nhật email, số điện thoại, phương thức thanh toán.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input defaultValue="you@example.com" />
              </div>
              <div className="grid gap-2">
                <Label>Số điện thoại</Label>
                <Input defaultValue="0901 234 567" />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label>Địa chỉ</Label>
                <Input defaultValue="123 Nguyễn Văn Cừ, Q5, TP.HCM" />
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Wallet className="h-4 w-4" />
                Thêm thẻ / ví điện tử
              </div>
              <Button>Lưu thay đổi</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-16 border-t">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 font-semibold"><Dumbbell className="h-5 w-5" />GymX</div>
            <p className="mt-2 text-sm text-slate-600">© 2025 GymX. All rights reserved.</p>
          </div>
          <div>
            <div className="font-semibold">Liên hệ</div>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              <li>Hotline: 1900 1234</li>
              <li>Email: hello@gymx.vn</li>
              <li>Địa chỉ: 123 Nguyễn Văn Cừ, Q5, TP.HCM</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold">Giờ mở cửa</div>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              <li>Thứ 2 - CN: 05:00 - 23:00</li>
              <li>Lễ tết: thông báo riêng</li>
            </ul>
          </div>
        </div>
        <Separator className="my-6" />
        <div className="text-xs text-slate-500">Made with ❤️ by your team.</div>
      </div>
    </footer>
  );
}

function AuthDialog({
  open, onOpenChange, onSuccess, initialMode = "login",
}: {
  open: boolean; onOpenChange: (v: boolean) => void; onSuccess: () => void; initialMode?: "login" | "signup"
}) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail]   = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login"|"signup">(initialMode);
  const [info, setInfo] = useState<string>("");

  useEffect(() => { setMode(initialMode); setInfo(""); }, [initialMode]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setInfo("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message?.toLowerCase().includes("email not confirmed")) {
          setInfo("Email của bạn chưa được xác minh. Vui lòng kiểm tra hộp thư hoặc bấm 'Gửi lại email xác nhận'.");
        } else {
          alert(error.message);
        }
        setLoading(false);
        return;
      }
      setLoading(false);
      onOpenChange(false);
      onSuccess();
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000" }
      });
      setLoading(false);
      if (error) { alert(error.message); return; }
      setInfo("Đã gửi email xác nhận. Vui lòng mở email và bấm xác minh trước khi đăng nhập.");
    }
  };

  const resend = async () => {
    await supabase.auth.resend({ type: "signup", email });
    setInfo("Đã gửi lại email xác nhận.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "login" ? "Đăng nhập" : "Đăng ký"}</DialogTitle>
          <DialogDescription>Nhập email & mật khẩu để tiếp tục.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input required type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="grid gap-2">
            <Label>Mật khẩu</Label>
            <Input required type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" />
          </div>

          {info && <p className="text-sm text-slate-600">{info}</p>}

          <DialogFooter className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-sm underline underline-offset-4"
            >
              {mode === "login" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
            </button>

            {mode === "login" && info.toLowerCase().includes("xác minh") && (
              <Button type="button" variant="outline" onClick={resend}>Gửi lại email xác nhận</Button>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? "Đang xử lý…" : (mode === "login" ? "Đăng nhập" : "Đăng ký")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

