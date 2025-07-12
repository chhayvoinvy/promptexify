import Image from "next/image";

// Testimonials data adapted for AI prompts platform
const testimonials = [
  {
    name: "Sarah Chen",
    job: "Content Creator",
    image: "/static/avatars/1.webp",
    review:
      "Promptexify has completely transformed my content creation workflow. The premium AI prompts are incredibly well-crafted and save me hours of brainstorming. The quality and variety are unmatched!",
  },
  {
    name: "Marcus Rodriguez",
    job: "Digital Marketing Manager",
    image: "/static/avatars/2.webp",
    review:
      "The AI prompts on Promptexify have elevated our marketing campaigns to a whole new level. The results are consistently impressive, and the time savings are incredible.",
  },
  {
    name: "Elena Petrov",
    job: "Freelance Writer",
    image: "/static/avatars/3.webp",
    review:
      "As a freelance writer, I need reliable and creative prompts. Promptexify delivers exactly that. The premium features are worth every penny!",
  },
  {
    name: "James Thompson",
    job: "Startup Founder",
    image: "/static/avatars/4.webp",
    review:
      "Promptexify has been instrumental in helping our startup create compelling content. The AI prompts are professional-grade and the platform is incredibly user-friendly.",
  },
  {
    name: "Lisa Wang",
    job: "AI Researcher",
    image: "/static/avatars/5.webp",
    review:
      "The quality of prompts on Promptexify is exceptional. As someone who works with AI daily, I can appreciate the thoughtfulness that goes into each prompt. Highly recommended!",
  },
  {
    name: "Alex Kumar",
    job: "Creative Director",
    image: "/static/avatars/6.webp",
    review:
      "Promptexify has become an essential tool in our creative process. The diverse range of high-quality prompts sparks innovation and helps us deliver outstanding results for our clients.",
  },
];

interface HeaderSectionProps {
  label?: string;
  title: string;
  subtitle?: string;
}

function HeaderSection({ label, title, subtitle }: HeaderSectionProps) {
  return (
    <div className="flex flex-col items-center text-center">
      {label ? (
        <div className="mb-4 font-semibold bg-gradient-to-r from-zinc-400 to-zinc-300 bg-clip-text text-transparent">
          {label}
        </div>
      ) : null}
      <h2 className="text-3xl md:text-4xl lg:text-[40px] font-bold">{title}</h2>
      {subtitle ? (
        <p className="mt-6 text-balance text-lg text-muted-foreground max-w-2xl">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section>
      <div className="flex-col gap-10 py-10 sm:gap-y-10">
        <HeaderSection
          label="Testimonials"
          title="What our users are sharing."
          subtitle="Discover the feedback from our users who are transforming their creative processes with AI prompts."
        />

        <div className="column-1 gap-5 space-y-5 md:columns-2 lg:columns-3 mt-10">
          {testimonials.map((item) => (
            <div className="break-inside-avoid" key={item.name}>
              <div className="relative rounded-xl border bg-muted/25">
                <div className="flex flex-col px-4 py-5 sm:p-6">
                  <div>
                    <div className="relative mb-4 flex items-center gap-3">
                      <span className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-full text-base">
                        <Image
                          width={100}
                          height={100}
                          className="size-full rounded-full border"
                          src={item.image}
                          alt={item.name}
                        />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {item.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.job}
                        </p>
                      </div>
                    </div>
                    <q className="text-muted-foreground">{item.review}</q>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
