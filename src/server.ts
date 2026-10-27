
import express, { Request, Response } from "express";
import path from "path";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

interface ShipmentEvent {
  status: string;
  date: string;
  time: string;
  description: string;
  completed: boolean;
}

interface Parcel {
  trackingId: string;
  sender: string;
  receiver: string;
  origin: string;
  destination: string;
  expectedDelivery: string;
  status: string;
  history: ShipmentEvent[];
}

const milestones = [
  "Order Placed",
  "Booked",
  "Picked Up",
  "Shipped",
  "In Transit",
  "Out for Delivery",
  "Delivered"
];

const descriptions: Record<string, string> = {
  "Order Placed": "Order confirmed",
  "Booked": "Parcel registered",
  "Picked Up": "Collected from sender",
  "Shipped": "Dispatched from facility",
  "In Transit": "Moving to destination",
  "Out for Delivery": "Courier is delivering the parcel",
  "Delivered": "Parcel delivered successfully"
};

function event(
  status: string,
  date: string,
  time: string,
  completed: boolean
): ShipmentEvent {
  return {
    status,
    date: completed ? date : "",
    time: completed ? time : "",
    description: completed ? descriptions[status] : "Pending",
    completed
  };
}

const parcels: Parcel[] = [
  {
    trackingId: "PDS1001",
    sender: "Online Store",
    receiver: "Varshith",
    origin: "Hyderabad",
    destination: "Secunderabad",
    expectedDelivery: "2026-10-29",
    status: "In Transit",
    history: [
      event("Order Placed", "2026-10-24", "09:15 AM", true),
      event("Booked", "2026-10-25", "10:30 AM", true),
      event("Picked Up", "2026-10-25", "02:45 PM", true),
      event("Shipped", "2026-10-26", "08:20 AM", true),
      event("In Transit", "2026-10-27", "11:10 AM", true),
      event("Out for Delivery", "", "", false),
      event("Delivered", "", "", false)
    ]
  },
  {
    trackingId: "PDS1002",
    sender: "Tech Store",
    receiver: "Rahul",
    origin: "Bengaluru",
    destination: "Hyderabad",
    expectedDelivery: "2026-10-28",
    status: "Out for Delivery",
    history: [
      event("Order Placed", "2026-10-23", "08:45 AM", true),
      event("Booked", "2026-10-24", "09:30 AM", true),
      event("Picked Up", "2026-10-24", "01:15 PM", true),
      event("Shipped", "2026-10-25", "07:50 AM", true),
      event("In Transit", "2026-10-26", "04:20 PM", true),
      event("Out for Delivery", "2026-10-27", "09:05 AM", true),
      event("Delivered", "", "", false)
    ]
  },
  {
    trackingId: "PDS1003",
    sender: "Book Store",
    receiver: "Priya",
    origin: "Chennai",
    destination: "Hyderabad",
    expectedDelivery: "2026-10-26",
    status: "Delivered",
    history: [
      event("Order Placed", "2026-10-22", "10:00 AM", true),
      event("Booked", "2026-10-23", "11:20 AM", true),
      event("Picked Up", "2026-10-23", "03:10 PM", true),
      event("Shipped", "2026-10-24", "08:40 AM", true),
      event("In Transit", "2026-10-25", "02:30 PM", true),
      event("Out for Delivery", "2026-10-26", "09:00 AM", true),
      event("Delivered", "2026-10-26", "01:35 PM", true)
    ]
  },
  {
    trackingId: "PDS1004",
    sender: "Fashion Hub",
    receiver: "Sneha",
    origin: "Mumbai",
    destination: "Hyderabad",
    expectedDelivery: "2026-10-30",
    status: "In Transit",
    history: [
      event("Order Placed", "2026-10-24", "09:40 AM", true),
      event("Booked", "2026-10-25", "10:10 AM", true),
      event("Picked Up", "2026-10-25", "02:00 PM", true),
      event("Shipped", "2026-10-26", "07:30 AM", true),
      event("In Transit", "2026-10-27", "12:15 PM", true),
      event("Out for Delivery", "", "", false),
      event("Delivered", "", "", false)
    ]
  },
  {
    trackingId: "PDS1005",
    sender: "Electronics Store",
    receiver: "Arjun",
    origin: "Delhi",
    destination: "Bengaluru",
    expectedDelivery: "2026-11-02",
    status: "Shipped",
    history: [
      event("Order Placed", "2026-10-25", "08:30 AM", true),
      event("Booked", "2026-10-26", "09:45 AM", true),
      event("Picked Up", "2026-10-26", "01:20 PM", true),
      event("Shipped", "2026-10-27", "07:15 AM", true),
      event("In Transit", "", "", false),
      event("Out for Delivery", "", "", false),
      event("Delivered", "", "", false)
    ]
  }
];

function findParcel(trackingId: string): Parcel | undefined {
  return parcels.find(
    parcel => parcel.trackingId.toLowerCase() === trackingId.toLowerCase()
  );
}

function currentDateTime() {
  const now = new Date();

  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);

  const time = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(now);

  return { date, time };
}

// Get all parcels
app.get("/api/parcels", (_req: Request, res: Response) => {
  res.json(parcels);
});

// Track a parcel
app.get("/api/parcels/:trackingId", (req: Request, res: Response) => {
  const trackingId = String(req.params.trackingId);
  const parcel = findParcel(trackingId);

  if (!parcel) {
    return res.status(404).json({
      message: "Parcel not found. Please check your tracking ID."
    });
  }

  return res.json(parcel);
});

// Update a parcel's status
app.put(
  "/api/parcels/:trackingId/status",
  (req: Request, res: Response) => {
    const trackingId = String(req.params.trackingId);
    const parcel = findParcel(trackingId);
    const status: unknown = req.body?.status;

    if (!parcel) {
      return res.status(404).json({
        message: "Parcel not found."
      });
    }

    if (
      typeof status !== "string" ||
      !milestones.includes(status) ||
      status === "Order Placed"
    ) {
      return res.status(400).json({
        message: "Please select a valid parcel status."
      });
    }

    const { date, time } = currentDateTime();
    const currentIndex = milestones.indexOf(status);

    // Update completed and pending milestones.
    parcel.history = milestones.map((milestone, index) => {
      const existing = parcel.history.find(
        item => item.status === milestone
      );

      if (index <= currentIndex) {
        if (milestone === status) {
          return event(milestone, date, time, true);
        }

        if (existing?.completed) {
          return { ...existing, completed: true };
        }

        // Sample timestamp for a newly completed earlier milestone.
        return event(milestone, date, time, true);
      }

      return event(milestone, "", "", false);
    });

    parcel.status = status;

    return res.json({
      message: "Parcel status updated successfully.",
      parcel
    });
  }
);

// Serve the website
app.use((_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
  console.log(
    `Parcel Delivery Status System running at http://localhost:${PORT}`
  );
});
