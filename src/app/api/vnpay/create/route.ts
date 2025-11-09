import { NextResponse } from "next/server";
import crypto from "crypto";

// encoder kiểu RFC3986: space = %20 (tương tự rawurlencode)
function encodeRFC3986(str: string) {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function sortObject(obj: Record<string, string>) {
  const out: Record<string, string> = {};
  Object.keys(obj).sort().forEach(k => (out[k] = obj[k]));
  return out;
}

function buildQuery(obj: Record<string, string>) {
  // dùng cùng 1 encoder cho CẢ ký và redirect
  return Object.keys(obj)
    .map(k => `${k}=${encodeRFC3986(obj[k])}`)
    .join("&");
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export async function POST(req: Request) {
  try {
    const { orderId, amount, orderInfo } = (await req.json()) as {
      orderId: string; amount: number; orderInfo: string;
    };
  
    const vnp_TmnCode    = requireEnv("VNP_TMN_CODE");
    const vnp_HashSecret = requireEnv("VNP_HASH_SECRET");
    const vnp_Url        = requireEnv("VNP_URL");          // ví dụ sandbox: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
    const vnp_ReturnUrl  = requireEnv("VNP_RETURN_URL");   // có thể là link ngrok
    const vnp_IpnUrl     = requireEnv("VNP_IPN_URL");
    const d = new Date();
    const pad = (n:number)=> n.toString().padStart(2,"0");
    const vnp_CreateDate = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

    const txnRef = (String(orderId).replace(/\D/g,"") || String(Date.now())).slice(0,32); // tối đa 32 ký tự

    const params: Record<string,string> = {
      vnp_Version:  "2.1.0",
      vnp_Command:  "pay",
      vnp_TmnCode:  vnp_TmnCode,
      vnp_Amount:   String(Math.round(amount) * 100), // *100
      vnp_CurrCode: "VND",
      vnp_ReturnUrl,
      vnp_TxnRef:   txnRef,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: "other",
      vnp_Locale:    "vn",
      vnp_CreateDate: vnp_CreateDate,
      vnp_IpAddr:     "127.0.0.1",
      vnp_IpnUrl,

    };

    const sorted = sortObject(params);

    // 1) Chuỗi KÝ (đã encode theo CÙNG 1 chuẩn)
    const signData = buildQuery(sorted);

    const vnp_SecureHash = crypto
      .createHmac("sha512", vnp_HashSecret)
      .update(signData, "utf8")
      .digest("hex");

    // 2) Chuỗi REDIRECT (dùng CHÍNH HÀM buildQuery ở trên để đảm bảo Y HỆT)
    const queryEncoded = buildQuery(sorted);
    const payUrl = `${vnp_Url}?${queryEncoded}&vnp_SecureHash=${vnp_SecureHash}`;

    // (khuyên) log để debug nếu còn sai
    console.log({ signData, vnp_SecureHash });

    return NextResponse.json({ ok: true, payUrl });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
