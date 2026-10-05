package com.railway.parcel.model;

import jakarta.validation.constraints.NotBlank;

public record StatusRequest(@NotBlank String status) {}
