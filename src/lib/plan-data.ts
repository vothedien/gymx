export type PlanInfo = {
  id: string;
  name: string;
  price: number;
  period: string;
  perks: string[];
  description?: string;
};

export const DEFAULT_PLANS: PlanInfo[] = [
  {
    id: "starter",
    name: "GymX Starter",
    price: 299_000,
    period: "tháng",
    perks: [
      "Truy cập phòng gym giờ hành chính",
      "Theo dõi lịch tập trên ứng dụng",
      "01 buổi tư vấn thể trạng",
    ],
    description: "Gói phù hợp người mới bắt đầu làm quen với phòng gym.",
  },
  {
    id: "standard",
    name: "GymX Standard",
    price: 499_000,
    period: "tháng",
    perks: [
      "Truy cập phòng gym không giới hạn",
      "02 buổi PT cá nhân/tháng",
      "Tham gia lớp nhóm miễn phí",
    ],
    description: "Giải pháp cân bằng giữa chi phí và tiện ích nâng cao.",
  },
  {
    id: "pro",
    name: "GymX Pro",
    price: 799_000,
    period: "tháng",
    perks: [
      "Quyền sử dụng 24/7 tất cả cơ sở",
      "04 buổi PT cá nhân/tháng",
      "Ưu đãi 15% dịch vụ bổ sung",
    ],
    description: "Toàn bộ đặc quyền cao cấp cho hội viên GymX.",
  },
];

export const getDefaultPlanById = (planId: string | null | undefined): PlanInfo | undefined => {
  if (!planId) return undefined;
  return DEFAULT_PLANS.find((plan) => plan.id === planId);
};
