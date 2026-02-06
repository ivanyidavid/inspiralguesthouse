import React, { useState } from "react";
import { Button } from "@/components/ui/button";

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

interface PriceTableProps {
  showAllGuests?: boolean;
  setShowAllGuests?: (show: boolean) => void;
}

function PriceTableComponent({ title, prices, showAllGuests, setShowAllGuests }: PriceTableProps & { title: string; prices: Record<string, number[]> }) {
  const visibleGuestCols = showAllGuests ? guestCols : [guestCols[0]];

  return (
    <div>
      <h4 className="font-medium mb-4">{title}</h4>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-airbnb-red text-white">
              <th className="px-4 py-2 text-left font-semibold">Guests</th>
              {visibleGuestCols.map((g) => (
                <th key={g} className="px-4 py-2 text-center font-semibold">{g}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m} className="border-t">
                <td className="px-4 py-2 font-medium text-airbnb-dark">{m}</td>
                {visibleGuestCols.map((_, i) => (
                  <td key={i} className="px-4 py-2 text-center">€{prices[m][i]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!showAllGuests && (
        <Button
          onClick={() => setShowAllGuests?.(true)}
          variant="outline"
          size="sm"
          className="text-airbnb-red border-airbnb-red hover:bg-red-50"
        >
          for more guests click <span className="underline ml-1">Here</span>
        </Button>
      )}
    </div>
  );
}

export default function PricingTable() {
  const [showAllGuests, setShowAllGuests] = useState(false);

  return (
    <section className="bg-white rounded-2xl shadow p-6">
      <div className="grid gap-8 md:grid-cols-2">
        <PriceTableComponent
          title="Weekday Prices (Sunday-Thursday nights)"
          prices={weekdayPrices}
          showAllGuests={showAllGuests}
          setShowAllGuests={setShowAllGuests}
        />

        <PriceTableComponent
          title="Weekend Prices (Friday-Saturday nights)"
          prices={weekendPrices}
          showAllGuests={showAllGuests}
          setShowAllGuests={setShowAllGuests}
        />
      </div>

      <div className="mt-6 text-sm text-airbnb-gray">
        <div>Cleaning Cost: €50</div>
        <div>Minimum Nights: 2</div>
        <div className="mt-2">Exceptions apply for public holidays and specific events (Sziget Festival, F1, others).</div>
      </div>
    </section>
  );
}
