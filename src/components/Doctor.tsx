export function Doctor() {
  return (
    <section className="py-20 border-t border-border/50">
      <div className="container-x grid lg:grid-cols-2 gap-12 lg:gap-20">
        <div>
          <p className="label-caps mb-4">The doctors</p>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-tight">
            A real doctor. Not a chatbot in scrubs.
          </h2>
        </div>
        <div className="space-y-8">
          <blockquote className="border-l-2 border-gold pl-6 font-serif italic text-xl sm:text-2xl text-foreground leading-snug">
            "Most men don't avoid the doctor because they don't care. They avoid it because the
            whole experience makes them feel ten years old again."
          </blockquote>
          <p className="text-muted-foreground leading-relaxed">
            Every Meneer prescription is reviewed and signed by a qualified HPCSA-registered doctor
            practising in South Africa. No call centres. No sales targets. Nobody upselling you a
            multivitamin.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Our team of doctors call it like they see it. If a treatment isn't right for you,
            they'll say so — and you won't pay a cent for the consult.
          </p>
        </div>
      </div>
    </section>
  );
}
