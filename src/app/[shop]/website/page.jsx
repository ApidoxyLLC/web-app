import CarouselWithProgress from "@/components/carousel-08";
import Domain from "@/components/domain";
import Website from "@/components/website";

export const metadata = {
  title: "Website & Apps | Website",
  description: "...",
};
export default function Dashboard() {
  return (
    <div className="flex flex-col p-6 gap-6 bg-muted/100">
      <div className="flex flex-col md:flex-row gap-6 ">
        <div className="flex-1 bg-card border text-card-foreground w-full shadow-sm rounded-lg items-start justify-start">
          <CarouselWithProgress />
        </div>
        <Website />
      </div>
      <Domain />
    </div>
  );
}
