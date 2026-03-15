"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";
import { Radar } from "react-chartjs-2";
import { useScoreStore, ScoreCategory } from "@/stores/scoreStore";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

const LABELS: Record<ScoreCategory, string> = {
  phishingIQ: "Phishing IQ",
  passwordHygiene: "Password Hygiene",
  networkSecurity: "Network Security",
  forensicSkill: "Forensic Skill",
};

const AXIS_ORDER: ScoreCategory[] = [
  "phishingIQ",
  "passwordHygiene",
  "networkSecurity",
  "forensicSkill",
];

export function RadarChart() {
  const categoryScores = useScoreStore((s) => s.categoryScores);
  const [animatedScores, setAnimatedScores] = useState([0, 0, 0, 0]);
  const [showNumbers, setShowNumbers] = useState(false);

  // Sequential vertex animation
  useEffect(() => {
    const scores = AXIS_ORDER.map((k) => categoryScores[k]);
    let step = 0;

    const interval = setInterval(() => {
      if (step >= 4) {
        clearInterval(interval);
        setShowNumbers(true);
        return;
      }
      setAnimatedScores((prev) => {
        const next = [...prev];
        next[step] = scores[step];
        return next;
      });
      step++;
    }, 400);

    return () => clearInterval(interval);
  }, [categoryScores]);

  const data = {
    labels: AXIS_ORDER.map((k) => LABELS[k]),
    datasets: [
      {
        label: "Your Score",
        data: animatedScores,
        backgroundColor: "rgba(37, 99, 235, 0.2)",
        borderColor: "rgba(37, 99, 235, 0.8)",
        borderWidth: 2,
        pointBackgroundColor: "rgba(37, 99, 235, 1)",
        pointRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      r: {
        min: 0,
        max: 25,
        ticks: {
          stepSize: 5,
          display: false,
        },
        grid: {
          color: "rgba(128, 128, 128, 0.2)",
        },
        angleLines: {
          color: "rgba(128, 128, 128, 0.2)",
        },
        pointLabels: {
          font: { size: 12, family: "Inter, sans-serif" },
          color: "var(--text-secondary)",
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx: { dataIndex: number; raw: unknown }) => {
            const axis = AXIS_ORDER[ctx.dataIndex];
            return `${LABELS[axis]}: ${ctx.raw}/25`;
          },
        },
      },
    },
  };

  const total = animatedScores.reduce((a, b) => a + b, 0);

  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="w-80 h-80">
        <Radar data={data} options={options} />
      </div>

      {showNumbers && (
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          {AXIS_ORDER.map((axis, i) => (
            <div
              key={axis}
              className="flex items-center justify-between gap-4 px-3 py-1 bg-bg-secondary rounded"
            >
              <span className="text-text-secondary text-xs">{LABELS[axis]}</span>
              <span className="font-bold text-text-primary">
                {animatedScores[i]}/25
              </span>
            </div>
          ))}
          <div className="col-span-2 text-center mt-2">
            <span className="text-lg font-bold text-accent">{total}/100</span>
            <span className="text-xs text-text-muted ml-2">Total Score</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
