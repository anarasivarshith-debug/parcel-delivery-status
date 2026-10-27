
import express, {
  Request,
  Response,
  NextFunction
} from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "parcels.json");
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const STATUSES = [
  "Booked",
  "Order Placed",
  "Picked Up",
  "Shipped",
  "In Transit",
  "Out for Delivery",
  "Delivered"
] as const;

interface HistoryEvent {
  status: string;
  description: string;
  location: string;
  date: string;
}

interface Parcel {
  trackingId: string;
  sender: string;
  receiver: string;
  origin: string;
  destination: string;
  expectedDelivery: string;
  status: string;
  history: HistoryEvent[];
}

const sessions = new Set<string>();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));

function ensureDataFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf8");
  }
}

function readParcels(): Parcel[] {
  ensureDataFile();

  try {
    const parsed: unknown = JSON.parse(
      fs.readFileSync(DATA_FILE, "utf8")
    );

    return Array.isArray(parsed) ? parsed as Parcel[] : [];
  } catch {
    throw new Error("Could not read data/parcels.json.");
  }
}

function writeParcels(parcels: Parcel[]): void {
  ensureDataFile();

  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(parcels, null, 2),
    "utf8"
  );
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function makeTrackingId(parcels: Parcel[]): string {
  let id = "";

  do {
    id = "PDS" + crypto.randomInt(1000, 10000);
  } while (parcels.some(
    parcel => parcel.trackingId === id
  ));

  return id;
}

function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = text(req.header("x-admin-token"));

  if (!token || !sessions.has(token)) {
    res.status(401).json({
      message: "Unauthorized. Please sign in again."
    });
    return;
  }

  next();
}

app.post(
  "/api/admin/login",
  (req: Request, res: Response): void => {
    const username = text(req.body?.username);
    const password = typeof req.body?.password === "string"
      ? req.body.password
      : "";

    if (
      username !== ADMIN_USERNAME ||
      password !== ADMIN_PASSWORD
    ) {
      res.status(401).json({
        message: "Invalid username or password."
      });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    sessions.add(token);

    res.json({
      message: "Login successful.",
      authenticated: true,
      token
    });
  }
);

app.get(
  "/api/admin/session",
  requireAdmin,
  (req: Request, res: Response): void => {
    const token = text(req.header("x-admin-token"));

    res.json({
      authenticated: true,
      token
    });
  }
);

app.post(
  "/api/admin/logout",
  requireAdmin,
  (req: Request, res: Response): void => {
    const token = text(req.header("x-admin-token"));
    sessions.delete(token);

    res.json({ message: "Signed out successfully." });
  }
);

app.get(
  "/api/parcels/:trackingId",
  (req: Request, res: Response): void => {
    const trackingId = text(req.params.trackingId);
    const parcel = readParcels().find(
      item => item.trackingId.toLowerCase() === trackingId.toLowerCase()
    );

    if (!parcel) {
      res.status(404).json({
        message: "Parcel not found. Check the tracking ID."
      });
      return;
    }

    res.json(parcel);
  }
);

app.get(
  "/api/parcels",
  requireAdmin,
  (_req: Request, res: Response): void => {
    res.json(readParcels());
  }
);

app.post(
  "/api/parcels",
  requireAdmin,
  (req: Request, res: Response): void => {
    const parcels = readParcels();

    const sender = text(req.body?.sender);
    const receiver = text(req.body?.receiver);
    const origin = text(req.body?.origin);
    const destination = text(req.body?.destination);
    const expectedDelivery = text(req.body?.expectedDelivery);

    if (
      !sender ||
      !receiver ||
      !origin ||
      !destination ||
      !expectedDelivery
    ) {
      res.status(400).json({
        message: "Please provide all required parcel fields."
      });
      return;
    }

    const date = new Date(expectedDelivery);

    if (Number.isNaN(date.getTime())) {
      res.status(400).json({
        message: "Expected delivery date is invalid."
      });
      return;
    }

    const trackingId = makeTrackingId(parcels);
    const now = new Date().toISOString();

    const parcel: Parcel = {
      trackingId,
      sender,
      receiver,
      origin,
      destination,
      expectedDelivery: date.toISOString(),
      status: "Booked",
      history: [{
        status: "Booked",
        description: "Parcel booking created.",
        location: origin,
        date: now
      }]
    };

    parcels.push(parcel);
    writeParcels(parcels);

    res.status(201).json(parcel);
  }
);

app.put(
  "/api/parcels/:trackingId/status",
  requireAdmin,
  (req: Request, res: Response): void => {
    const parcels = readParcels();
    const trackingId = text(req.params.trackingId);

    const parcel = parcels.find(
      item => item.trackingId.toLowerCase() === trackingId.toLowerCase()
    );

    if (!parcel) {
      res.status(404).json({
        message: "Parcel not found."
      });
      return;
    }

    const status = text(req.body?.status);
    const location = text(req.body?.location);
    const description = text(req.body?.description);

    if (!(STATUSES as readonly string[]).includes(status)) {
      res.status(400).json({
        message: "Please select a valid parcel status."
      });
      return;
    }

    if (!location) {
      res.status(400).json({
        message: "Location is required."
      });
      return;
    }

    parcel.status = status;
    parcel.history = Array.isArray(parcel.history)
      ? parcel.history
      : [];

    parcel.history.push({
      status,
      description: description || "Parcel status updated.",
      location,
      date: new Date().toISOString()
    });

    writeParcels(parcels);
    res.json(parcel);
  }
);

app.get("/api/health", (_req: Request, res: Response): void => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  ensureDataFile();
  console.log(`ParcelTrack is running at http://localhost:${PORT}`);
});
