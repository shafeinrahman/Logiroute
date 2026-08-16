**LOGIROUTE: ENHANCED ENTITY-RELATIONSHIP (EER) DICTIONARY**

_Data Structural Maps, Cardinality Specifications, and Crow's Foot Notations_

# 1\. Comprehensive Entity Dictionary

| **Entity Name**     | **Primary Key (PK)**    | **Foreign Keys (FK)**                           | **Key Structural Attributes**        |
| ------------------- | ----------------------- | ----------------------------------------------- | ------------------------------------ |
| items               | item_id                 | None                                            | name, sku, safety_threshold          |
| warehouses          | warehouse_id            | None                                            | name, location_zone                  |
| warehouse_stocks    | (item_id, warehouse_id) | item_id -> items <br>warehouse_id -> warehouses | stock_quantity                       |
| defective_inventory | (item_id, warehouse_id) | (item_id, warehouse_id) -> warehouse_stocks     | quarantine_reason, date_logged       |
| drivers             | driver_id               | None                                            | full_name, status_flag, rating       |
| orders              | order_id                | driver_id (Nullable)                            | address, shipping_type, order_status |
| trips               | trip_id                 | driver_id -> drivers                            | distance_miles, start_time, end_time |

# 2\. Relational Assertions & Crow's Foot Cardinalities

| **Relationship Vector**        | **Cardinality Type**          | **Crow's Foot Layout Description**                                                                                                                                       |
| ------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| items to warehouse_stocks      | One-to-Many (1:N)             | Parent terminal uses absolute exactly-one notation line hashes (\|). Associative terminal uses a zero-or-many crow's foot element (O<-). Constraint: ON DELETE RESTRICT. |
| warehouses to warehouse_stocks | One-to-Many (1:N)             | Parent terminal uses absolute exactly-one notation line hashes (\|). Associative terminal uses a zero-or-many crow's foot element (O<-). Constraint: ON DELETE RESTRICT. |
| drivers to trips               | One-to-Many (1:N)             | Driver terminal uses exactly-one structural hash symbols (\|). Trip terminal uses zero-or-many notation (O<-). Constraint: ON DELETE CASCADE.                            |
| drivers to orders              | One-to-Optional Many (1:0..N) | Driver terminal uses an optional-one notation circle/hash (O\|). Order terminal contains zero-or-many indicator (O<-) for pending status states.                         |

# 3\. Enhanced Relational Subclassing (ISA Specialization)

Superclass Entity: warehouse_stocks  
Subclass Entity: defective_inventory  
Constraint Rule: Disjoint (d) - A stock record item row is isolated in a quarantined table structure if it fails verification checks. The subclass entity inherits the identical structural compound primary key configuration (item_id, warehouse_id) from its structural parent table instance via an ON DELETE CASCADE constraint.