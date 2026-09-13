import {
  Armchair,
  Bike,
  Briefcase,
  Building2,
  Camera,
  Car,
  ChefHat,
  Clock,
  Drill,
  FileText,
  GraduationCap,
  Hammer,
  Laptop,
  Monitor,
  PenTool,
  Scissors,
  Shirt,
  Smartphone,
  Sparkles,
  Store,
  Tag,
  Truck,
  Tv,
  WashingMachine,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Category name → icon. Fallback is Tag so unknown categories never break. */
const iconMap: Record<string, LucideIcon> = {
  Plumbing: Wrench,
  Electrical: Zap,
  "Auto repair": Car,
  "Auto services": Car,
  Cleaning: Sparkles,
  Tutoring: GraduationCap,
  Photography: Camera,
  "Graphic design": PenTool,
  Catering: ChefHat,
  "Barber & beauty": Scissors,
  "Appliance repair": WashingMachine,
  "IT & computer repair": Laptop,
  "Building & construction": Hammer,
  "Phones & tablets": Smartphone,
  Computers: Monitor,
  Furniture: Armchair,
  Vehicles: Car,
  Clothing: Shirt,
  Electronics: Tv,
  Appliances: WashingMachine,
  "Tools & equipment": Drill,
  "Full-time": Briefcase,
  "Part-time": Clock,
  Casual: Bike,
  Freelance: Laptop,
  Contract: FileText,
  Gig: Zap,
  Delivery: Truck,
  "Media & marketing": Camera,
  "Admin & office": Building2,
  Retail: Store,
  Seller: Tag,
};

export function iconFor(name: string): LucideIcon {
  return iconMap[name] ?? Tag;
}

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = iconFor(name);
  return <Icon className={className} aria-hidden="true" />;
}
