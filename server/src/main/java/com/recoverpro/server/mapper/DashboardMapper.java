package com.recoverpro.server.mapper;

import com.recoverpro.server.dto.response.MonthlyCollectionTrendResponse;
import com.recoverpro.server.dto.response.TrendPoint;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class DashboardMapper {

    private static final String[] MONTHS =
            {"","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"};

    public BigDecimal safeDecimal(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    public double safePercent(long numerator, long denominator) {
        if (denominator == 0) return 0.0;
        return Math.round((numerator * 100.0 / denominator) * 100.0) / 100.0;
    }

    public List<TrendPoint> toMonthlyTrend(List<Object[]> rows) {
        return rows.stream().map(row -> {
            int year  = ((Number) row[0]).intValue();
            int month = ((Number) row[1]).intValue();
            BigDecimal amount = row[2] != null ? (BigDecimal) row[2] : BigDecimal.ZERO;
            long count        = row[3] != null ? ((Number) row[3]).longValue() : 0L;
            String label = (month >= 1 && month <= 12)
                    ? MONTHS[month] + " " + year : month + "/" + year;
            return TrendPoint.builder()
                    .year(year).month(month).label(label)
                    .totalAmount(amount).totalCount(count).build();
        }).collect(Collectors.toList());
    }

    public List<TrendPoint> toWeeklyTrend(List<Object[]> rows) {
        return rows.stream().map(row -> {
            int year = ((Number) row[0]).intValue();
            int week = ((Number) row[1]).intValue();
            BigDecimal amount = row[2] != null ? (BigDecimal) row[2] : BigDecimal.ZERO;
            long count        = row[3] != null ? ((Number) row[3]).longValue() : 0L;
            return TrendPoint.builder()
                    .year(year).month(week).label("W" + week + " " + year)
                    .totalAmount(amount).totalCount(count).build();
        }).collect(Collectors.toList());
    }

    public List<MonthlyCollectionTrendResponse> toMonthlyTrendResponse(List<Object[]> rows) {
        return rows.stream().map(row -> {
            int year  = ((Number) row[0]).intValue();
            int month = ((Number) row[1]).intValue();
            BigDecimal amount = row[2] != null ? (BigDecimal) row[2] : BigDecimal.ZERO;
            long count        = row[3] != null ? ((Number) row[3]).longValue() : 0L;
            String label = (month >= 1 && month <= 12)
                    ? MONTHS[month] + " " + year : month + "/" + year;
            return MonthlyCollectionTrendResponse.builder()
                    .year(year).month(month).monthLabel(label)
                    .totalAmount(amount).totalCount(count)
                    .growthRate(BigDecimal.ZERO).build();
        }).collect(Collectors.toList());
    }

    public List<TrendPoint> toCountMonthlyTrendFromString(List<Object[]> rows) {
        return rows.stream().map(row -> {
            String monthStr = (String) row[0];
            long count = row[1] != null ? ((Number) row[1]).longValue() : 0L;
            int year  = monthStr != null ? Integer.parseInt(monthStr.substring(0, 4)) : 0;
            int month = monthStr != null ? Integer.parseInt(monthStr.substring(5, 7)) : 0;
            String label = (month >= 1 && month <= 12)
                    ? MONTHS[month] + " " + year : (monthStr != null ? monthStr : "");
            return TrendPoint.builder()
                    .year(year).month(month).label(label)
                    .totalAmount(BigDecimal.ZERO).totalCount(count).build();
        }).collect(Collectors.toList());
    }

    public List<TrendPoint> applyGrowthRate(List<TrendPoint> trend) {
        return trend == null ? Collections.emptyList() : trend;
    }

    /** Converts rows in (YYYY-MM string, count, amount) format — used by system-wide and org trend queries. */
    public List<TrendPoint> toMonthlyTrendFromString(List<Object[]> rows) {
        return rows.stream().map(row -> {
            String monthStr = (String) row[0]; // e.g. "2025-04"
            long count   = row[1] != null ? ((Number) row[1]).longValue() : 0L;
            BigDecimal amount = row[2] != null ? (BigDecimal) row[2] : BigDecimal.ZERO;
            int year  = monthStr != null ? Integer.parseInt(monthStr.substring(0, 4)) : 0;
            int month = monthStr != null ? Integer.parseInt(monthStr.substring(5, 7)) : 0;
            String label = (month >= 1 && month <= 12)
                    ? MONTHS[month] + " " + year : (monthStr != null ? monthStr : "");
            return TrendPoint.builder()
                    .year(year).month(month).label(label)
                    .totalAmount(amount).totalCount(count).build();
        }).collect(Collectors.toList());
    }
}