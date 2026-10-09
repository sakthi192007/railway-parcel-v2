CREATE DATABASE railway_parcel;
USE railway_parcel;
CREATE TABLE customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address VARCHAR(255)
);
CREATE TABLE trains (
    train_id INT AUTO_INCREMENT PRIMARY KEY,
    train_no VARCHAR(20) NOT NULL,
    train_name VARCHAR(100) NOT NULL,
    source VARCHAR(100),
    destination VARCHAR(100),
    distance_km INT,
    departure_time TIME,
    capacity_kg DECIMAL(10,2)
);
CREATE TABLE parcels (
    parcel_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    train_id INT NOT NULL,
    description VARCHAR(255),
    weight_kg DECIMAL(10,2),
    charge DECIMAL(10,2),
    status VARCHAR(30) DEFAULT 'BOOKED',
    booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id),

    FOREIGN KEY (train_id)
        REFERENCES trains(train_id)
);
CREATE TABLE parcel_tracking (
    tracking_id INT AUTO_INCREMENT PRIMARY KEY,
    parcel_id INT NOT NULL,
    status VARCHAR(30),
    remarks VARCHAR(255),
    tracked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (parcel_id)
        REFERENCES parcels(parcel_id)
);
INSERT INTO customers
(name, phone, email, address)
VALUES
('Sakthi', '9876543210', 'sakthi@gmail.com', 'Chennai'),
('Priya', '9876543211', 'priya@gmail.com', 'Coimbatore'),
('Divya', '9876543212', 'divya@gmail.com', 'Madurai');
SELECT * FROM customers;
INSERT INTO trains
(train_no, train_name, source, destination, distance_km, departure_time, capacity_kg)
VALUES
('12601', 'Chennai Express', 'Chennai', 'Coimbatore', 500, '06:30:00', 5000),
('12602', 'CBE Express', 'Chennai', 'Coimbatore', 500, '08:00:00', 6000),
('12603', 'Pandian Express', 'Chennai', 'Madurai', 460, '21:00:00', 5500),
('12604', 'Vaigai Express', 'Chennai', 'Madurai', 460, '07:00:00', 4500);
SELECT * FROM trains;
INSERT INTO parcels
(customer_id, train_id, description, weight_kg, charge, status)
VALUES
(1, 1, 'Books', 5, 200, 'BOOKED'),
(2, 1, 'Clothes', 8, 300, 'IN_TRANSIT'),
(3, 2, 'Electronics', 10, 400, 'BOOKED'),
(1, 2, 'Documents', 3, 150, 'BOOKED');
SELECT
    p.parcel_id,
    p.description,
    p.weight_kg,
    p.charge,
    p.status,
    c.name AS customer_name,
    c.phone AS customer_phone,
    t.train_no,
    t.train_name,
    t.source,
    t.destination
FROM parcels p
JOIN customers c
    ON c.customer_id = p.customer_id
JOIN trains t
    ON t.train_id = p.train_id;
    USE railway_parcel;

SHOW TABLES;
SELECT * FROM customers;
USE railway_parcel;

SELECT p.parcel_id, p.description, p.weight_kg, p.charge, p.status,
       DATE_FORMAT(p.booked_at, '%Y-%m-%d %H:%i') AS booked_at,
       c.customer_id,
       c.name AS customer_name,
       c.phone AS customer_phone,
       t.train_id,
       t.train_no,
       t.train_name,
       t.source,
       t.destination
FROM parcels p
JOIN customers c ON c.customer_id = p.customer_id
JOIN trains t ON t.train_id = p.train_id
ORDER BY p.parcel_id DESC;
USE railway_parcel;

DESCRIBE parcels;
DESCRIBE trains;
DESCRIBE parcel_tracking;
USE railway_parcel;

SHOW CREATE PROCEDURE BOOK_PARCEL;
USE railway_parcel;

SELECT
    p.parcel_id,
    p.customer_id,
    p.train_id,
    p.description,
    p.weight_kg,
    p.charge,
    p.status,
    DATE_FORMAT(p.booked_at, '%Y-%m-%d %H:%i:%s') AS booked_at,

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
ORDER BY p.parcel_id DESC;
USE railway_parcel;

SELECT parcel_id, status
FROM parcels;
USE railway_parcel;

SELECT
    t.train_id,
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
    FROM (
        SELECT COUNT(p2.parcel_id) AS parcel_count
        FROM trains t2
        LEFT JOIN parcels p2
            ON p2.train_id = t2.train_id
        GROUP BY t2.train_id
    ) AS train_counts
)
ORDER BY COUNT(p.parcel_id) DESC;
SELECT AVG(parcel_count) AS average_parcels
FROM (
    SELECT COUNT(p.parcel_id) AS parcel_count
    FROM trains t
    LEFT JOIN parcels p
        ON p.train_id = t.train_id
    GROUP BY t.train_id
) AS train_counts;
DROP FUNCTION IF EXISTS CALCULATE_PARCEL_CHARGE;

DELIMITER $$

CREATE FUNCTION CALCULATE_PARCEL_CHARGE(
    p_weight DECIMAL(10,2),
    p_distance DECIMAL(10,2)
)
RETURNS DECIMAL(12,2)
DETERMINISTIC
BEGIN

    DECLARE v_charge DECIMAL(12,2);

    SET v_charge =
        50
        + (p_weight * 20)
        + (p_distance * 0.50);

    RETURN ROUND(v_charge, 2);

END$$

DELIMITER ;
SELECT CALCULATE_PARCEL_CHARGE(3, 500) AS charge;
DESCRIBE trains;
DROP PROCEDURE IF EXISTS BOOK_PARCEL;

DELIMITER $$

CREATE PROCEDURE BOOK_PARCEL(
    IN P_CUSTOMER_ID BIGINT,
    IN P_TRAIN_ID BIGINT,
    IN P_DESCRIPTION VARCHAR(250),
    IN P_WEIGHT DECIMAL(10,2),
    OUT P_PARCEL_ID BIGINT
)
BEGIN

    DECLARE V_DISTANCE DECIMAL(10,2);
    DECLARE V_CHARGE DECIMAL(12,2);

    -- Validate weight
    IF P_WEIGHT <= 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
        'Weight must be greater than zero';

    END IF;


    -- Get distance of selected train
    SELECT distance_km
    INTO V_DISTANCE
    FROM trains
    WHERE train_id = P_TRAIN_ID;


    -- Check whether train exists
    IF V_DISTANCE IS NULL THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
        'Train not found';

    END IF;


    -- Call FUNCTION
    SET V_CHARGE =
        CALCULATE_PARCEL_CHARGE(
            P_WEIGHT,
            V_DISTANCE
        );


    -- Insert parcel
    INSERT INTO parcels
    (
        customer_id,
        train_id,
        description,
        weight_kg,
        charge,
        status
    )
    VALUES
    (
        P_CUSTOMER_ID,
        P_TRAIN_ID,
        P_DESCRIPTION,
        P_WEIGHT,
        V_CHARGE,
        'BOOKED'
    );


    -- Get generated parcel ID
    SET P_PARCEL_ID = LAST_INSERT_ID();


    -- Initial tracking record
    INSERT INTO parcel_tracking
    (
        parcel_id,
        status,
        remarks
    )
    VALUES
    (
        P_PARCEL_ID,
        'BOOKED',
        'Parcel booked successfully'
    );

END$$

DELIMITER ;
DROP TRIGGER IF EXISTS trg_parcel_status_tracking;

DELIMITER $$

CREATE TRIGGER trg_parcel_status_tracking
AFTER UPDATE ON parcels
FOR EACH ROW
BEGIN

    IF NOT (OLD.status <=> NEW.status) THEN

        INSERT INTO parcel_tracking
        (
            parcel_id,
            status,
            remarks
        )
        VALUES
        (
            NEW.parcel_id,
            NEW.status,
            CONCAT(
                'Status changed from ',
                COALESCE(OLD.status, 'NULL'),
                ' to ',
                NEW.status
            )
        );

    END IF;

END$$

DELIMITER ;
UPDATE parcels
SET status = 'IN_TRANSIT'
WHERE parcel_id = 1;