"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip
} from "chart.js";
import { Radar } from "react-chartjs-2";
import { useScoreStore, ScoreCategory } from "@/stores/scoreStore";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

const LABELS: Record<ScoreCategory, string> = {
  phishingIQ: "Phishing IQ",
  passwordHygiene: "Password Hygiene",
  networkSecurity: "Network Security",
  forensicSkill: "Forensic Skill"
};

const AXIS_ORDER: ScoreCategory[] = [
  "phishingIQ",
  "passwordHygiene",
  "networkSecurity",
  "forensicSkill"
];

export function RadarChart() {
  const categoryScores = useScoreStore((s) => s.categoryScores);
  const [animatedScores, setAnimatedScores] = useState([0, 0, 0, 0]);
  const [showNumbers, setShowNumbers] = useState(false);

  useEffect(() => {
    const scores = AXIS_ORDER.map((k) => categoryScores[k]);
    let step = 0;

    const interval = setInterval(() => {
      // 1. Use scores.length instead of a hardcoded 4
      if (step >= scores.length) {
        clearInterval(interval);
        setShowNumbers(true);
        return;
      }

      // 2. Capture the exact step for this specific interval tick
      const currentStep = step;

      setAnimatedScores((prev) => {
        const next = [...prev];
        // 3. Use the captured constant, NOT the mutable 'step' variable
        next[currentStep] = scores[currentStep];
        return next;
      });

      // 4. Now it is safe to increment
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
        pointRadius: 4
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    // Add this layout section:
    layout: {
      padding: {
        left: 30, // Gives room for the left label
        right: 30, // Gives room for the right label
        top: 10,
        bottom: 10
      }
    },
    scales: {
      r: {
        min: 0,
        max: 150, // Nominal max for visualization
        ticks: {
          stepSize: 10,
          display: false
        },
        grid: {
          color: "rgba(128, 128, 128, 0.2)"
        },
        angleLines: {
          color: "rgba(128, 128, 128, 0.2)"
        },
        pointLabels: {
          font: { size: 12, family: "Inter, sans-serif" },
          color: "var(--text-secondary)"
        }
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx: { dataIndex: number; raw: unknown }) => {
            const axis = AXIS_ORDER[ctx.dataIndex];
            return `${LABELS[axis]}: ${ctx.raw}`;
          }
        }
      }
    }
  };

  const total = Object.values(categoryScores).reduce((a, b) => a + b, 0);

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
              className="flex items-center justify-between gap-4 px-3 py-1 bg-window-sunken rounded"
            >
              <span className="text-secondary text-xs">{LABELS[axis]}</span>
              <span className="font-bold text-primary">
                {animatedScores[i]}
              </span>
            </div>
          ))}
          <div className="col-span-2 text-center mt-2">
            <span className="text-lg font-bold text-accent">
              Total Score: {total}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
