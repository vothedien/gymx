'use client';

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Check, Loader2, ShieldCheck, Smartphone, Wallet } from "lucide-react";

const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

type Plan = {
  id: string;
  name: string;
  price: number;
  period: string;
  perks?: string[] | null;
  description?: string | null;
};

type PaymentMethod = "VNPAY" | "MOMO";

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get("planId");

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("VNPAY");
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      setSessionChecked(true);
    };
    fetchSession();
  }, []);

  useEffect(() => {
    if (!planId) {
      setPlan(null);
      setLoadingPlan(false);
      setLoadingError("missing-plan");
      return;
    }

    const loadPlan = async () => {
      setLoadingPlan(true);
      const { data, error } = await supabase
        .from("plans")
        .select("id, name, price, period, perks, description")
        .eq("id", planId)
        .single();

      if (error || !data) {
        setPlan(null);
        setLoadingError("not-found");
      } else {
        setPlan(data as Plan);
        setLoadingError(null);
      }
      setLoadingPlan(false);
    };

    loadPlan();
  }, [planId]);

  const perks = useMemo(() => {
    if (plan && Array.isArray(plan.perks) && plan.perks.length) {
      return plan.perks;
    }
    return [
      "Truy cập phòng gym không giới hạn",
      "Theo dõi tiến độ và lịch lớp trên app",
      "Hỗ trợ từ HLV và đội ngũ chăm sóc",
    ];
  }, [plan]);

  const handleCheckout = async () => {
    if (!plan) {
      return;
    }
    if (!userId) {
      router.push("/#pricing");
      return;
    }
    if (paymentMethod !== "VNPAY") {
      alert("Thanh toán MoMo đang được hoàn thiện. Vui lòng chọn VNPAY nhé!");
      return;
    }

    try {
      setSubmitting(true);
      const invoiceId = `INV${Date.now()}`;
      const { error: invErr } = await supabase.from("invoices").insert({
        id: invoiceId,
        user_id: userId,
        plan_id: plan.id,
        amount: plan.price,
        method: paymentMethod,
        status: "pending",
      });

      if (invErr) {
        console.error(invErr);
        alert("Không tạo được hoá đơn. Vui lòng thử lại.");
        setSubmitting(false);
        return;
      }

      const response = await fetch("/api/vnpay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: invoiceId,
          amount: plan.price,
          orderInfo: `Thanhtoan${plan.name}`,
        }),
      });

      const result = await response.json();
      if (!result?.ok || !result.payUrl) {
        alert("Không tạo được link thanh toán. Vui lòng thử lại.");
        setSubmitting(false);
        return;
      }

      window.location.href = result.payUrl as string;
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra. Vui lòng thử lại sau.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-10">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="w-fit gap-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>
          <Button variant="outline" onClick={() => router.push("/#pricing")}>Chọn gói khác</Button>
        </div>

        <div className="mb-10 max-w-3xl">
          <Badge className="mb-3 w-fit bg-blue-100 text-blue-600" variant="secondary">
            Thanh toán an toàn
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Giỏ hàng của bạn</h1>
          <p className="mt-3 text-slate-600">
            Kiểm tra thông tin gói tập và chọn phương thức thanh toán phù hợp.
          </p>
        </div>

        {loadingPlan ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : !plan ? (
          <Card className="rounded-3xl border-dashed">
            <CardHeader>
              <CardTitle>Không tìm thấy gói tập</CardTitle>
              <CardDescription>
                {loadingError === "missing-plan"
                  ? "Vui lòng chọn gói tập từ trang chủ để tiến hành thanh toán."
                  : "Gói tập bạn chọn không còn tồn tại hoặc đã bị gỡ."}
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => router.push("/#pricing")}>Quay lại trang gói tập</Button>
            </CardFooter>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.7fr,1fr]">
            <div className="space-y-6">
              <Card className="rounded-3xl border-blue-100 bg-white/80 shadow-sm">
                <CardHeader className="space-y-3">
                  <Badge variant="outline" className="w-fit border-blue-200 bg-blue-50 text-blue-600">
                    Đơn hàng
                  </Badge>
                  <CardTitle>Gói tập {plan.name}</CardTitle>
                  <CardDescription>
                    {plan.description ?? "Thanh toán 1 lần, kích hoạt ngay sau khi hoàn tất."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between rounded-2xl bg-slate-50 p-4">
                    <div>
                      <p className="font-medium text-slate-900">Chu kỳ {plan.period}</p>
                      <p className="text-sm text-slate-500">Gia hạn linh hoạt, không ràng buộc.</p>
                    </div>
                    <span className="text-xl font-semibold text-blue-600">{formatVND(plan.price)}</span>
                  </div>
                  <div>
                    <p className="mb-2 font-medium text-slate-900">Quyền lợi nổi bật</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {perks.map((perk) => (
                        <div
                          key={perk}
                          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
                        >
                          <Check className="h-4 w-4 text-blue-500" />
                          {perk}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-sm text-slate-500">Tổng cộng</span>
                  <span className="text-2xl font-semibold text-slate-900">{formatVND(plan.price)}</span>
                </CardFooter>
              </Card>

              <Card className="rounded-3xl bg-slate-900 text-slate-100">
                <CardHeader>
                  <CardTitle className="text-slate-100">Cam kết GymX</CardTitle>
                  <CardDescription className="text-slate-300">
                    Bạn luôn được hỗ trợ trong suốt hành trình tập luyện.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3">
                  {[
                    {
                      title: "Bảo mật",
                      desc: "Thanh toán được mã hoá và bảo vệ nhiều lớp.",
                    },
                    {
                      title: "Hỗ trợ nhanh",
                      desc: "Nhân viên liên hệ trong 15 phút sau khi có vấn đề.",
                    },
                    {
                      title: "Linh hoạt",
                      desc: "Gia hạn và nâng cấp gói dễ dàng trên ứng dụng.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="rounded-2xl border border-slate-700/80 bg-slate-800/60 p-4">
                      <p className="font-medium text-slate-100">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-300">{item.desc}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="rounded-3xl border-slate-200/70 bg-white/90 shadow-lg">
                <CardHeader className="space-y-3">
                  <CardTitle>Phương thức thanh toán</CardTitle>
                  <CardDescription>Chúng tôi hỗ trợ nhiều cổng thanh toán phổ biến.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("VNPAY")}
                    className={`w-full rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                      paymentMethod === "VNPAY"
                        ? "border-blue-500 bg-blue-50/80 shadow-sm"
                        : "border-slate-200 hover:border-blue-400"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                          <Wallet className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">VNPay</p>
                          <p className="text-sm text-slate-500">
                            Thanh toán nhanh qua ngân hàng nội địa và thẻ quốc tế.
                          </p>
                        </div>
                      </div>
                      {paymentMethod === "VNPAY" && (
                        <Badge className="bg-blue-500 text-white">Đang chọn</Badge>
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("MOMO")}
                    className={`w-full rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-rose-400/40 ${
                      paymentMethod === "MOMO"
                        ? "border-rose-400 bg-rose-50/80"
                        : "border-slate-200 hover:border-rose-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-500">
                          <Smartphone className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">MoMo</p>
                          <p className="text-sm text-slate-500">Sẽ ra mắt sớm. Hỗ trợ thanh toán ví điện tử MoMo.</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-rose-100 text-rose-600">
                        Sắp ra mắt
                      </Badge>
                    </div>
                  </button>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleCheckout}
                    disabled={submitting || paymentMethod !== "VNPAY"}
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tạo liên kết VNPAY...
                      </span>
                    ) : (
                      "Thanh toán với VNPAY"
                    )}
                  </Button>
                  {paymentMethod === "MOMO" && (
                    <p className="text-sm text-rose-500">
                      Cổng thanh toán MoMo đang được hoàn thiện, vui lòng chọn VNPAY trong thời gian này.
                    </p>
                  )}
                  {sessionChecked && !userId && (
                    <p className="text-sm text-amber-600">
                      Vui lòng đăng nhập tại trang chủ để hoàn tất thanh toán.
                    </p>
                  )}
                </CardFooter>
              </Card>

              <Card className="rounded-3xl border-slate-200 bg-white/70">
                <CardHeader>
                  <CardTitle>Hỗ trợ 24/7</CardTitle>
                  <CardDescription>
                    Đội ngũ chăm sóc khách hàng luôn sẵn sàng nếu bạn cần trợ giúp khi thanh toán.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-500" />
                    Hotline: <a href="tel:19001234" className="font-medium text-slate-900">1900 1234</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-500" />
                    Email: <a href="mailto:support@gymx.vn" className="font-medium text-slate-900">support@gymx.vn</a>
                  </div>
                  <Separator />
                  <p className="text-xs text-slate-500">
                    Khi hoàn tất thanh toán, hoá đơn điện tử sẽ được gửi về email và cập nhật trong mục lịch sử giao dịch.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
