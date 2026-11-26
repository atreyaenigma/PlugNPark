"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

// The QR holds a link to the pass page, so a phone camera opens it and an admin can check the driver in.
export default function PassCard({ ticket }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  return (
    <div className="pass">
      <div className="qr-box">
        {origin ? <QRCodeSVG value={`${origin}/pass/${ticket.code}`} size={96} level="M" bgColor="#FFFFFF" fgColor="#0F172A" marginSize={0} /> : <div className="qr-ph" />}
      </div>
      <div>
        <b>{ticket.code}</b>
        <p>{ticket.station}<br />{ticket.detail}, {ticket.hours} h<br />Estimated ₹{ticket.total}</p>
        <Link href={`/pass/${ticket.code}`} className="pass-link">Open full pass</Link>
      </div>
    </div>
  );
}
