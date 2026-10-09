package com.railway.parcel.controller;

import com.railway.parcel.model.*;
import com.railway.parcel.service.ParcelService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins="http://localhost:5173")
public class ParcelController {
    private final ParcelService service;
    public ParcelController(ParcelService service){this.service=service;}

    @GetMapping("/customers") public List<Customer> customers(){return service.customers();}

    @PostMapping("/customers")
    public ResponseEntity<Map<String,Object>> addCustomer(@Valid @RequestBody CustomerRequest request){
        Long id = service.addCustomer(request);
        return ResponseEntity.ok(Map.of("message","Customer added","customerId",id));
    }

    @GetMapping("/trains") public List<Train> trains(){return service.trains();}
    @GetMapping("/trains/above-average") public List<Train> aboveAverage(){return service.aboveAverage();}
    @GetMapping("/parcels") public List<Parcel> parcels(){return service.parcels();}

    @PostMapping("/parcels/book")
    public ResponseEntity<Map<String,Object>> book(@Valid @RequestBody BookingRequest request){
        Long id=service.book(request);
        return ResponseEntity.ok(Map.of("message","Parcel booked successfully","parcelId",id));
    }

    @PutMapping("/parcels/{id}/status")
    public ResponseEntity<Map<String,String>> status(@PathVariable Long id,@Valid @RequestBody StatusRequest request){
        service.status(id,request.status());
        return ResponseEntity.ok(Map.of("message","Status updated; tracking record created by Oracle trigger"));
    }

    @GetMapping("/parcels/{id}/tracking") public List<Map<String,Object>> tracking(@PathVariable Long id){return service.tracking(id);}
}