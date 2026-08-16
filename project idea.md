**Project LogiRoute** 

This system is a smart coordinator for a small business that owns multiple storage warehouses and a fleet of local delivery drivers. It tracks items on shelves, groups orders by location, manages drivers, handles customer updates, and manages returned items.  
Module A: Managing Storage & Items (Member 1\)

    F1: Smart Item Counter: Tracks exactly how many units of each product are sitting in which specific warehouse. It prevents the system from accidentally creating duplicate records for the same item in the same room.

    F2: Low Stock Warning System: A page or script that constantly watches inventory levels. If a product drops below a safe number in any warehouse, it lights up a red flag so staff know to reorder.

    F3: Safe Stock Mover: Allows workers to move products from Warehouse A to Warehouse B. It updates both warehouses at the exact same moment so that items never temporarily "disappear" from the system if the computer glitches out halfway through.

Module B: Orders & Driver Delivery (Member 2\)

    F4: Delivery Zone Grouper: Takes all customer orders waiting to go out and automatically bundles them together by their zip code or neighborhood so drivers don't waste gas driving all over the city.

    F5: Driver Dispatcher: Assigns a group of orders to an available driver. With one click, it changes the orders to "Out for Delivery" and changes the driver's status to "Busy/On a Trip."

    F6: Express Lane Skipper: Allows customers to pay extra for "Express Shipping." The system reads this tag and automatically bumps those premium orders to the very front of the driver’s delivery line.

Module C: Driver Pay & Ratings (Member 3\)

    F7: Digital Trip Log: When a driver returns, the system saves a summary of their trip, noting exactly what time they left and arrived, how many miles they drove, and if any deliveries failed.

    F8: Automated Paycheck Calculator: Calculates what a driver earned at the end of the week by taking a flat rate per trip and adding a bonus amount for every mile they drove.

    F9: Poor Performance Flag: Scans driver delivery histories. If a driver gets bad customer reviews or drops too many packages, the system automatically marks their profile as "Under Review" for management to check.

Module D: Customer Account & Updates

    F10: Arrival Time Guesser: Estimates a package delivery window by calculating how far away the warehouse is from the customer's house, combined with how many packages the driver has to drop off first.

    F11: Text & Email Simulator: A background system that notices when an order changes (like moving from "Packing" to "Shipped") and automatically drops a message into a queue to text or email the customer.

    F12: Star Rating & Review Box: A simple form where a customer can rate their experience out of 5 stars and select complaint tags (like "Late Delivery" or "Broken Item") if something went wrong.

Module E: Returns & Refunds

    F13: Return Request Tracker: A portal that allows customers to print a return label. It links their return directly to their original receipt details and tracks the package status (e.g., "Mailed Back", "Arrived at Warehouse").

    F14: Damaged Box Quarantine: If a customer returns a broken item, the system permanently locks that specific item into a virtual "Damaged Goods" shelf so it can never be accidentally sold to another customer.

    F15: Automatic Customer Refund: Once a store manager approves a return, the system instantly calculates the refund amount, adds store credit back to the customer's account balance, and prints a digital receipt.