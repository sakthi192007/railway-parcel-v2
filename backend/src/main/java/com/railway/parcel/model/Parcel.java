package com.railway.parcel.model;

import java.math.BigDecimal;

public record Parcel(
        Long parcelId,
        Long customerId,
        Long trainId,
        String description,
        BigDecimal weightKg,
        BigDecimal charge,
        String status,
        String bookedAt,
        String customerName,
        String trainNo,
        String trainName,
        String source,
        String destination
) {
}