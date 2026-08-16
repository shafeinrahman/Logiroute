**Teammate 1: Customer, Orders & Returns**

**1\. Missing sales report**

Join customer with items (via orders/order\_items) to find customers who have never bought a given item or category   
Tables: customer, orders, order\_items, items

**2\. Return tracking**  
Return-request workflow using the original\_order → returned\_order link, with status moving through Mailed Back → Arrived at Warehouse (this replaces "recursive return" — flag with your instructor if a recursive CTE is specifically required).

Tables: returns, orders

**3\. Customer dashboard**  
A summary view pulling one customer's order history, star ratings given, and store credit balance into a single screen or query.

Tables: customer, orders, returns 

**Teammate 2: Drivers, Dispatch & Pay**

**1\. Driver–warehouse coverage map**

Join drivers with warehouses on location\_zone to show which drivers can realistically service which warehouse.

Tables: drivers, warehouses

**2\. Driver earnings**   
Weekly paycheck calculation: base\_rate per trip plus per\_km\_bonus × distance\_miles, summed from trips into paycheck.

Tables: trips, paycheck, drivers

**3\. Order dispatch and notification**   
Assign a driver to a group of orders: set orders.driver\_id, flip order status to "Out for Delivery," and set the driver's status\_flag to "Busy." (Notification/text-email is dropped for now since notification\_queue isn't in the actual schema — add it only if you extend the tables.)

Tables: orders, drivers

**Teammate 3: Items & Warehouse Stock**

**1\. Item–warehouse stock matrix**

Join items with warehouses (via warehouse\_stocks) to show the full stock distribution of every item across every warehouse.

Tables: items, warehouses, warehouse\_stocks

**2\. Low stock alert**   
Query warehouse\_stocks where stock\_quantity is below the item's safety\_threshold.

Tables: warehouse\_stocks, items

**3\. Goods monitoring**  
Report/insert view over damaged\_inventory and expired\_inventory so quarantined stock can never be resold.

Tables: damaged\_inventory, expired\_inventory

