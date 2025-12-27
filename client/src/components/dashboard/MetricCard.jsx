import React from "react";
import { FiTrendingUp, FiTrendingDown } from "react-icons/fi";

const MetricCard = ({
  icon,
  title,
  value,
  trend,
  trendColor = "text-green-400",
  showChart = false,
  actionButton = null,
  backgroundImage = null,
  subtitle = null,
  isSpecialCard = false,
  showProgressBar = false,
  progressValue = 0,
  progressLabel = null,
  loading = false,
}) => {
  // Loading skeleton state
  if (loading) {
    return (
      <div className="bg-[#263F43] border border-white/10 rounded-xl p-3 animate-pulse">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <div className="h-3 bg-white/10 rounded w-20 mb-2"></div>
              <div className="h-6 bg-white/20 rounded w-24"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Special card variant (for Payout card with image background)
  if (isSpecialCard && backgroundImage) {
    return (
      <div
        className="relative rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 overflow-hidden border border-white/10"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          minHeight: "100px",
        }}
      >
        {/* Subtle overlay for better text readability while preserving image */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/70 to-green-600/70"></div>

        <div className="relative z-10 flex flex-row items-center justify-between gap-3 h-full">
          {/* Left Column - Data */}
          <div className="flex flex-col justify-center flex-1">
            {/* Large Number */}
            <div className="text-4xl font-bold text-white mb-1 font-['Albert_Sans'] leading-tight">
              {value}
            </div>

            {/* Title */}
            <div className="text-base font-medium text-white mb-0.5 font-['Albert_Sans']">
              {title}
            </div>

            {/* Subtitle */}
            {subtitle && (
              <div className="text-xs text-white/90 font-['Albert_Sans']">
                {subtitle}
              </div>
            )}
          </div>

          {/* Right Column - Button */}
          {actionButton && (
            <div className="flex items-center justify-center flex-shrink-0">
              {actionButton}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Regular card variant
  return (
    <div className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/80 flex-shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
              {title}
            </h3>
            <div className="text-xl font-semibold text-white font-['Albert_Sans']">
              {value}
            </div>
            {subtitle && (
              <div className="text-xs text-white/60 mt-1 font-['Albert_Sans']">
                {subtitle}
              </div>
            )}
          </div>
        </div>
        {showChart && (
          <div className="text-green-400 flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 12L9 6L13 10L21 2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M21 6V2H17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Progress Bar with Label (for Today payin and Commission cards) */}
      {showProgressBar && (
        <div className="mb-1.5">
          <div className="flex items-center gap-2 mb-0.5">
            {progressLabel && (
              <span className="text-xs text-green-400 font-['Albert_Sans']">
                {progressLabel}
              </span>
            )}
            <div className="flex-1 bg-white/10 rounded-full h-1.5 max-w-24">
              <div
                className="bg-green-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progressValue, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {trend && (
        <div
          className={`flex items-center gap-1 text-xs font-['Albert_Sans'] ${trendColor}`}
        >
          {trendColor === "text-green-400" ? (
            <FiTrendingUp className="text-xs" />
          ) : (
            <FiTrendingDown className="text-xs" />
          )}
          <span>{trend}</span>
        </div>
      )}

      {actionButton && <div className="mt-2">{actionButton}</div>}
    </div>
  );
};

export default MetricCard;
