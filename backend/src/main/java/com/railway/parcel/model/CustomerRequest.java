package com.railway.parcel.model;

import jakarta.validation.constraints.NotBlank;

public record CustomerRequest(
        @NotBlank String name,
        @NotBlank String phone,
        String email,
        String address) {}