package com.railway.parcel.repository;

import com.railway.parcel.model.*;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.SqlOutParameter;
import org.springframework.jdbc.core.SqlParameter;
import org.springframework.jdbc.core.simple.SimpleJdbcCall;
import org.springframework.stereotype.Repository;

import java.sql.Types;
import java.util.List;
import java.util.Map;

@Repository
public class ParcelRepository {

    private final JdbcTemplate jdbc;

    public ParcelRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ---------------------------------------------------------
    // CUSTOMERS
    // ---------------------------------------------------------

    public List<Customer> customers() {

        String sql = """
                SELECT customer_id,
                       name,
                       phone,
                       email,
                       address
                FROM customers
                ORDER BY customer_id
                """;

        return jdbc.query(sql, (r, n) ->
                new Customer(
                        r.getLong("customer_id"),
                        r.getString("name"),
                        r.getString("phone"),
                        r.getString("email"),
                        r.getString("address")
                )
        );
    }

    // ---------------------------------------------------------
    // TRAINS
    // ---------------------------------------------------------

    public List<Train> trains() {

        String sql = """
                SELECT train_id,
                       train_no,
                       train_name,
                       source,
                       destination
                FROM trains
                ORDER BY train_id
                """;

        return jdbc.query(sql, (r, n) ->
                new Train(
                        r.getLong("train_id"),
                        r.getString("train_no"),
                        r.getString("train_name"),
                        r.getString("source"),
                        r.getString("destination")
                )
        );
    }

    // ---------------------------------------------------------
    // SUBQUERY
    // Trains carrying more parcels than average
    // ---------------------------------------------------------

    public List<Train> aboveAverage() {

        String sql = """
                SELECT t.train_id,
                       t.train_no,
                       t.train_name,
                       t.source,
                       t.destination
                FROM trains t
                LEFT JOIN parcels p
                       ON p.train_id = t.train_id
                GROUP BY
                       t.train_id,
                       t.train_no,
                       t.train_name,
                       t.source,
                       t.destination
                HAVING COUNT(p.parcel_id) >
                       (
                           SELECT AVG(parcel_count)
                           FROM
                           (
                               SELECT COUNT(p2.parcel_id) AS parcel_count
                               FROM trains t2
                               LEFT JOIN parcels p2
                                      ON p2.train_id = t2.train_id
                               GROUP BY t2.train_id
                           ) AS train_counts
                       )
                ORDER BY COUNT(p.parcel_id) DESC
                """;

        return jdbc.query(sql, (r, n) ->
                new Train(
                        r.getLong("train_id"),
                        r.getString("train_no"),
                        r.getString("train_name"),
                        r.getString("source"),
                        r.getString("destination")
                )
        );
    }

    // ---------------------------------------------------------
    // PARCELS
    // JOIN CUSTOMER + TRAIN
    // ---------------------------------------------------------

    public List<Parcel> parcels() {

        String sql = """
                SELECT
                    p.parcel_id,
                    p.customer_id,
                    p.train_id,
                    p.description,
                    p.weight_kg,
                    p.charge,
                    p.status,
                    DATE_FORMAT(
                        p.booked_at,
                        '%Y-%m-%d %H:%i:%s'
                    ) AS booked_at,

                    c.name AS customer_name,

                    t.train_no,
                    t.train_name,
                    t.source,
                    t.destination

                FROM parcels p

                JOIN customers c
                     ON p.customer_id = c.customer_id

                JOIN trains t
                     ON p.train_id = t.train_id

                ORDER BY p.parcel_id DESC
                """;

        return jdbc.query(sql, (r, n) ->
                new Parcel(
                        r.getLong("parcel_id"),
                        r.getLong("customer_id"),
                        r.getLong("train_id"),
                        r.getString("description"),
                        r.getBigDecimal("weight_kg"),
                        r.getBigDecimal("charge"),
                        r.getString("status"),
                        r.getString("booked_at"),
                        r.getString("customer_name"),
                        r.getString("train_no"),
                        r.getString("train_name"),
                        r.getString("source"),
                        r.getString("destination")
                )
        );
    }

    // ---------------------------------------------------------
    // BOOK PARCEL
    // MySQL INSERT
    // ---------------------------------------------------------

  // ---------------------------------------------------------
// BOOK PARCEL
// Calls MySQL BOOK_PARCEL procedure
// ---------------------------------------------------------

public Long book(BookingRequest b) {

    SimpleJdbcCall call =
            new SimpleJdbcCall(jdbc)
                    .withProcedureName("BOOK_PARCEL")  // ← THIS LINE
                    .declareParameters(
                            new SqlParameter(
                                    "P_CUSTOMER_ID",
                                    Types.BIGINT
                            ),
                            new SqlParameter(
                                    "P_TRAIN_ID",
                                    Types.BIGINT
                            ),
                            new SqlParameter(
                                    "P_DESCRIPTION",
                                    Types.VARCHAR
                            ),
                            new SqlParameter(
                                    "P_WEIGHT",
                                    Types.DECIMAL
                            ),
                            new SqlOutParameter(
                                    "P_PARCEL_ID",
                                    Types.BIGINT
                            )
                    );

    Map<String, Object> result =
            call.execute(
                    Map.of(
                            "P_CUSTOMER_ID", b.customerId(),
                            "P_TRAIN_ID", b.trainId(),
                            "P_DESCRIPTION", b.description(),
                            "P_WEIGHT", b.weight()
                    )
            );

    Number parcelId =
            (Number) result.get("P_PARCEL_ID");

    if (parcelId == null) {
        throw new RuntimeException(
                "Failed to generate parcel ID"
        );
    }

    return parcelId.longValue();
}
    // ---------------------------------------------------------
    // UPDATE STATUS
    // ---------------------------------------------------------

    public void updateStatus(Long id, String status) {

        String sql = """
                UPDATE parcels
                SET status = ?
                WHERE parcel_id = ?
                """;

        int rows = jdbc.update(sql, status, id);

        if (rows == 0) {
            throw new RuntimeException(
                    "Parcel not found: " + id
            );
        }
    }

    // ---------------------------------------------------------
    // TRACKING
    // ---------------------------------------------------------

    public List<Map<String, Object>> tracking(Long id) {

        String sql = """
                SELECT
                    tracking_id,
                    parcel_id,
                    status,
                    remarks,
                    tracked_at
                FROM parcel_tracking
                WHERE parcel_id = ?
                ORDER BY tracking_id
                """;

        return jdbc.queryForList(sql, id);
    }
}