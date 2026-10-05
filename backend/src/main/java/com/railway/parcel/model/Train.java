package com.railway.parcel.model;

public record Train(
        Long trainId,
        String trainNo,
        String trainName,
        String source,
        String destination
) {
}