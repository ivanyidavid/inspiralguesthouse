import React from "react";

const months = [
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
];

const guestCols = ["1-6", "7", "8", "9", "10", "11"];

const weekdayPrices: Record<string, number[]> = {
  February: [120, 135, 150, 165, 180, 195],
  March: [120, 135, 150, 165, 180, 195],
  April: [130, 145, 160, 175, 190, 205],
  May: [130, 145, 160, 175, 190, 205],
  June: [140, 155, 170, 185, 200, 215],
  July: [140, 155, 170, 185, 200, 215],
  August: [140, 155, 170, 185, 200, 215],
};

const weekendPrices: Record<string, number[]> = {
  February: [140, 155, 170, 185, 200, 215],
  March: [140, 155, 170, 185, 200, 215],
  April: [150, 165, 180, 195, 210, 225],
  May: [150, 165, 180, 195, 210, 225],
  June: [160, 175, 190, 205, 220, 235],
  July: [160, 175, 190, 205, 220, 235],
  August: [160, 175, 190, 205, 220, 235],
};

export default function PricingTable() {
  return (
    <section className="bg-white rounded-2xl shadow p-6">
      <h3 className="text-2xl font-semibold text-airbnb-dark mb-4">Pricing</h3>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <h4 className="font-medium mb-2">Weekday Prices (Sunday-Thursday nights)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-airbnb-gray">
                  <th className="pr-4 pb-2">Month</th>
                  {guestCols.map((g) => (
                    <th key={g} className="pr-4 pb-2">{g}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m} className="border-t">
                    <td className="py-2 font-medium">{m}</td>
                    {weekdayPrices[m].map((p, i) => (
                      <td key={i} className="py-2">€{p}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Weekend Prices (Friday-Saturday nights)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-airbnb-gray">
                  <th className="pr-4 pb-2">Month</th>
                  {guestCols.map((g) => (
                    <th key={g} className="pr-4 pb-2">{g}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m} className="border-t">
                    <td className="py-2 font-medium">{m}</td>
                    {weekendPrices[m].map((p, i) => (
                      <td key={i} className="py-2">€{p}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm text-airbnb-gray">
        <div>Cleaning Cost: €50</div>
        <div>Minimum Nights: 2</div>
        <div className="mt-2">Exceptions apply for public holidays and specific events (Sziget Festival, F1, others).</div>
      </div>
    </section>
  );
}
