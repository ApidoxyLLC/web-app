import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CreditCard,
  Download,
  FileText,
  Package,
  RefreshCw,
  Settings,
  Zap,
  Smartphone, Globe, Link, Users
} from "lucide-react";

const invoices = [
  {
    id: "INV-001",
    date: "Mar 1, 2024",
    amount: "$29.00",
    status: "Paid",
  },
  {
    id: "INV-002",
    date: "Feb 1, 2024",
    amount: "$29.00",
    status: "Paid",
  },
  {
    id: "INV-003",
    date: "Jan 1, 2024",
    amount: "$29.00",
    status: "Paid",
  },
];
const limitations = [
  {
    name: "Basic",
    price: 10,
    progresslimit: [
      {
        icon: "smartphone",
        title: "App Builds",
        value: 1,
        limit: 1
      },
      {
        icon: "globe",
        title: "Subdomains",
        value: 1,
        limit: 1
      },
      {
        icon: "link",
        title: "Custom Domains",
        value: 0,
        limit: 0
      },
      {
        icon: "users",
        title: "Users",
        value: 1,
        limit: 1
      },
      {
        icon: <Zap className="text-primary size-4" ></Zap>,
        title: "Push Notifications",
        value: 100,
        limit: 500
      },
      {
        icon: "package",
        title: "Products",
        value: 10,
        limit: 15
      }
    ]
  }
];

export default function UserBilling() {
  return (
    <div className="container mx-auto px-4 py-6 md:px-6 2xl:max-w-[1400px]">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div>
            <h1 className="text-2xl font-semibold">Billing & Subscription</h1>
            <p className="text-muted-foreground text-sm">
              Manage your subscription and billing details
            </p>
          </div>
          <Button variant="outline">
            <Settings className="mr-2 size-4" />
            Billing Settings
          </Button>
        </div>

        {/* Current Plan */}
        <Card className="mb-8 p-0">
          <CardContent className="p-6">
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row">
              <div>
                <div className="flex items-center gap-2">
                  <Package className="text-primary size-5" />
                  <h2 className="text-lg font-semibold">{limitations[0]?.name} Plan</h2>
                  <Badge>Current Plan</Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                 {limitations[0]?.price} BDT/month • Renews on April 1, 2024
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline">Change Plan</Button>
                <Button variant="destructive">Cancel Plan</Button>
              </div>
            </div>

            <div className="mt-6 space-y-4">
  {limitations[0]?.progresslimit?.map((item, idx) => {
    const percent = (item.limit > 0) ? (item.value / item.limit) * 100 : 100;

    const iconMap = {
      smartphone: <Smartphone className="text-primary size-4" />,
      globe: <RefreshCw className="text-primary size-4" />,
      link: <Link className="text-primary size-4" />,
      users: <Settings className="text-primary size-4" />,
      zap: <Zap className="text-primary size-4" />,
      package: <Package className="text-primary size-4" />,
    };

    return (
      <div key={idx}>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {typeof item.icon === "string" ? iconMap[item.icon] : item.icon}
            <span className="text-sm font-medium">{item.title}</span>
          </div>
          <span className="text-sm">
            {item.value} / {item.limit}
          </span>
        </div>
        <Progress value={percent} className="h-2" />
      </div>
    );
  })}
</div>

          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card className="mb-8 p-0">
          <CardContent className="p-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Payment Method</h2>
                <div className="flex items-center gap-2">
                  <CreditCard className="text-muted-foreground size-4" />
                  <span className="text-muted-foreground text-sm">
                    Visa ending in 4242
                  </span>
                </div>
              </div>
              <Button variant="outline">Update Payment Method</Button>
            </div>
          </CardContent>
        </Card>

        {/* Billing History */}
        <Card className="p-0">
          <CardContent className="p-6">
            <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row">
              <h2 className="text-lg font-semibold">Billing History</h2>
              <Button variant="outline" size="sm">
                <Download className="mr-2 size-4" />
                Download All
              </Button>
            </div>

            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex flex-col items-start justify-between gap-3 border-b py-3 last:border-0 sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-muted rounded-md p-2">
                      <FileText className="text-muted-foreground size-4" />
                    </div>
                    <div>
                      <p className="font-medium">{invoice.id}</p>
                      <p className="text-muted-foreground text-sm">
                        {invoice.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{invoice.status}</Badge>
                    <span className="font-medium">{invoice.amount}</span>
                    <Button variant="ghost" size="sm">
                      <Download className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
