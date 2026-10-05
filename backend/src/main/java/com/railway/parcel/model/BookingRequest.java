package com.railway.parcel.model;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record BookingRequest(
    @NotNull Long customerId,
    @NotNull Long trainId,
    @NotBlank String parcelType,
    String description,
    @NotNull @DecimalMin("0.01") BigDecimal weight,
    @NotNull @DecimalMin("0.01") BigDecimal distanceKm
) {}
