export interface MarketingStats {
  totalUsers: number;
  totalTrades: number;
  totalVolume: number;
  activeUsers: number;
  averageReturn: number;
  uptime: number;
  lastUpdated: string;
}

export interface MarketingFeature {
  id: string;
  title: string;
  description: string;
  icon: string;
  category:
    | "data"
    | "portfolio"
    | "risk"
    | "analysis"
    | "security"
    | "developer";
}

export interface MarketingTestimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  avatar: string;
}

export interface MarketingPricing {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  popular: boolean;
  ctaText: string;
}

export interface NewsletterSubscription {
  email: string;
  subscribedAt: Date;
  status: "active" | "unsubscribed";
}
