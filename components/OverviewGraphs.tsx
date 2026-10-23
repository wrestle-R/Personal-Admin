"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  DoughnutController,
  ArcElement,
  BarController,
  BarElement,
} from "chart.js";
Chart.register(
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  DoughnutController,
  ArcElement,
  BarController,
  BarElement,
);

type Category = { name: string; count: number };
type Day = { date: string; views: number; visitors: number };
type Website = { id: string; name: string; views: number };
const palette = ["#91b7aa", "#88a7c4", "#c2b78d", "#a89ab9"];
const tooltip = {
  backgroundColor: "#232b27",
  titleColor: "#eef3ed",
  bodyColor: "#c1cec2",
  borderColor: "#465647",
  borderWidth: 1,
  padding: 10,
  displayColors: true,
};
function Traffic({ days }: { days: Day[] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvas.current) return;
    const chart = new Chart(canvas.current, {
      type: "line",
      data: {
        labels: days.map((d) =>
          new Date(d.date + "T12:00:00").toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          }),
        ),
        datasets: [
          {
            label: "Page views",
            data: days.map((d) => d.views),
            borderColor: palette[0],
            backgroundColor: "#91b7aa15",
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
          {
            label: "Daily visitors",
            data: days.map((d) => d.visitors),
            borderColor: palette[1],
            borderDash: [4, 4],
            tension: 0.3,
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? false
          : { duration: 450 },
        interaction: { mode: "index", intersect: false },
        plugins: { legend: { display: false }, tooltip },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: "#87968a",
              font: { size: 9 },
              maxTicksLimit: 6,
              maxRotation: 0,
            },
          },
          y: {
            beginAtZero: true,
            suggestedMax: 1,
            border: { display: false },
            ticks: {
              color: "#87968a",
              font: { size: 9 },
              maxTicksLimit: 4,
              precision: 0,
            },
            grid: { color: "#ffffff08" },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [days]);
  return (
    <div className="overview-line">
      <canvas
        ref={canvas}
        role="img"
        aria-label={`Daily traffic: ${days.map((d) => `${d.date}, ${d.views} views, ${d.visitors} visitors`).join("; ")}`}
      />
      {!days.some((d) => d.views) && (
        <span className="graph-empty">No recorded visits in this period</span>
      )}
    </div>
  );
}
function Devices({ rows }: { rows: Category[] }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    total = rows.reduce((n, r) => n + r.count, 0);
  useEffect(() => {
    if (!canvas.current || !total) return;
    const chart = new Chart(canvas.current, {
      type: "doughnut",
      data: {
        labels: rows.map((r) => r.name),
        datasets: [
          {
            data: rows.map((r) => r.count),
            backgroundColor: palette,
            borderWidth: 0,
            hoverOffset: 3,
            spacing: 3,
            borderRadius: 3,
          },
        ],
      },
      options: {
        cutout: "80%",
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip },
      },
    });
    return () => chart.destroy();
  }, [rows, total]);
  return (
    <div className="device-graph">
      <div className={`device-ring ${total ? "" : "no-data"}`}>
        <canvas
          ref={canvas}
          role="img"
          aria-label={
            total
              ? rows.map((r) => `${r.name}: ${r.count}`).join(", ")
              : "No device data yet"
          }
        />
        <div className="ring-total">
          <strong>{total.toLocaleString("en-IN")}</strong>
          <span>views</span>
        </div>
      </div>
      <div className="device-legend">
        {(rows.length
          ? rows
          : [
              { name: "Desktop / laptop", count: 0 },
              { name: "Mobile", count: 0 },
              { name: "Tablet", count: 0 },
            ]
        ).map((r, i) => (
          <div key={r.name}>
            <i
              style={{
                background: total ? palette[i % palette.length] : "#465248",
              }}
            />
            <span>{r.name}</span>
            <strong>{total ? Math.round((r.count / total) * 100) : 0}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
function Comparison({ rows, label }: { rows: Category[]; label: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvas.current) return;
    const chart = new Chart(canvas.current, {
      type: "bar",
      data: {
        labels: rows.map((r) => r.name),
        datasets: [
          {
            label: "Page views",
            data: rows.map((r) => r.count),
            backgroundColor: palette,
            borderRadius: 3,
            barThickness: 9,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip },
        scales: {
          x: { beginAtZero: true, suggestedMax: 1, display: false },
          y: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: "#aab7aa", font: { size: 10 } },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [rows]);
  return (
    <div className="comparison-graph">
      <canvas
        ref={canvas}
        role="img"
        aria-label={`${label}: ${rows.map((r) => `${r.name}, ${r.count} views`).join("; ")}`}
      />
      <div className="comparison-values">
        {rows.map((r) => (
          <span key={r.name}>{r.count.toLocaleString("en-IN")}</span>
        ))}
      </div>
    </div>
  );
}
export default function OverviewGraphs({
  days,
  devices,
  browsers,
  websites,
  range,
}: {
  days: Day[];
  devices: Category[];
  browsers: Category[];
  websites: Website[];
  range: number;
}) {
  const browserRows = browsers.length
    ? browsers.slice(0, 4)
    : [
        { name: "Chrome", count: 0 },
        { name: "Safari", count: 0 },
        { name: "Firefox", count: 0 },
        { name: "Edge", count: 0 },
      ];
  return (
    <div className="overview-graphs">
      <section className="panel overview-traffic">
        <div className="mini-heading">
          <h2>Traffic</h2>
          <span className="chart-key">
            <i />
            Views <i />
            Daily visitors
          </span>
        </div>
        <Traffic days={days} />
      </section>
      <section className="panel overview-devices">
        <div className="mini-heading">
          <h2>Devices</h2>
          <span className="tiny">Share of views</span>
        </div>
        <Devices rows={devices} />
      </section>
      <section className="panel overview-websites">
        <div className="mini-heading">
          <h2>By website</h2>
          <span className="tiny">Last {range} days</span>
        </div>
        <Comparison
          label="Website views"
          rows={websites.map((s) => ({ name: s.name, count: s.views }))}
        />
        <div className="website-shortcuts">
          {websites.map((s) => (
            <Link href={`/${s.id}?days=${range}`} key={s.id}>
              {s.name}
              <span>↗</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="panel overview-browsers">
        <div className="mini-heading">
          <h2>Browsers</h2>
          <span className="tiny">
            {browsers.length ? "By page views" : "Waiting for visits"}
          </span>
        </div>
        <Comparison label="Browser views" rows={browserRows} />
      </section>
    </div>
  );
}
