package com.railway.parcel.service;

import com.railway.parcel.model.*;
import com.railway.parcel.repository.ParcelRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;

@Service
public class ParcelService {
    private final ParcelRepository repo;
    public ParcelService(ParcelRepository repo){this.repo=repo;}
    public List<Customer> customers(){return repo.customers();}
    public List<Train> trains(){return repo.trains();}
    public List<Train> aboveAverage(){return repo.aboveAverage();}
    public List<Parcel> parcels(){return repo.parcels();}
    public Long book(BookingRequest r){return repo.book(r);}
    public void status(Long id,String status){repo.updateStatus(id,status);}
    public List<Map<String,Object>> tracking(Long id){return repo.tracking(id);}
}
