
const values = [
  {
    headline: "Plan together, in real time",
    body: "Share a trip to view or edit. Changes show up for everyone as they happen.",
  },
  {
    headline: "Every trip you\u2019ve ever taken, in one place",
    body: "Next year you can still pull up the confirmation number and the restaurant you loved.",
  },
  {
    headline: "AI that handles the busywork",
    body: "Drop in a screenshot or PDF of a confirmation and it becomes itinerary items. Ask for dinner near your hotel and get real places.",
  },
];

const ValueProps = () => {
  return (
    // Shares the cream ground with the app showcase above, so the top padding is
    // short: two full section paddings stacked into a ~150px void on a phone.
    <section className="bg-background pb-20 pt-6 md:pb-28 md:pt-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {values.map((v) => (
            <div
              key={v.headline}
              className="text-center md:text-left"
            >
              <h3 className="font-display text-xl md:text-2xl text-earth-600 [text-wrap:balance]">
                {v.headline}
              </h3>
              <p className="font-sans text-base text-earth-500 mt-3 leading-relaxed [text-wrap:pretty]">
                {v.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ValueProps;
