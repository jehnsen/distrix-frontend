import type { OrderDetail } from "@/lib/api";
import { sum } from "@/lib/money";
import type { TrailStage } from "@/components/distrix/document-trail";

/**
 * Turns an order and everything downstream of it into the four trail stages.
 * Kept out of the view so the same shape can drive the invoice and payment
 * pages, which show the identical chain from a different vantage point.
 */
export function orderTrailStages(detail: OrderDetail): TrailStage[] {
  const { order, deliveries, invoices, payments } = detail;

  return [
    {
      key: "order",
      label: "Order",
      pendingLabel: "Not yet raised",
      nodes: [
        {
          id: order.id,
          docNo: order.soNo,
          status: order.status,
          date: order.orderDate,
          href: `/orders/${order.soNo}`,
          amount: order.total,
        },
      ],
    },
    {
      key: "deliveries",
      label: `Deliveries${deliveries.length > 1 ? ` (${deliveries.length})` : ""}`,
      pendingLabel:
        order.status === "cancelled" ? "Order cancelled" : "Nothing shipped yet",
      nodes: deliveries.map((dr) => ({
        id: dr.id,
        docNo: dr.drNo,
        status: dr.status,
        date: dr.deliveryDate,
        href: `/deliveries/${dr.drNo}`,
        qty: dr.lines.reduce((acc, line) => acc + line.qtyShipped, 0),
      })),
    },
    {
      key: "invoices",
      label: `Invoices${invoices.length > 1 ? ` (${invoices.length})` : ""}`,
      pendingLabel: "Not billed yet",
      nodes: invoices.map((invoice) => ({
        id: invoice.id,
        docNo: invoice.siNo,
        status: invoice.status,
        date: invoice.invoiceDate,
        href: `/invoices/${invoice.siNo}`,
        amount: invoice.amountDue,
      })),
    },
    {
      key: "payments",
      label: `Payments${payments.length > 1 ? ` (${payments.length})` : ""}`,
      pendingLabel: "Nothing collected yet",
      nodes: payments.map((payment) => ({
        id: payment.id,
        docNo: payment.prNo,
        status: payment.status,
        date: payment.date,
        href: `/payments/${payment.prNo}`,
        amount: sum(payment.allocations.map((allocation) => allocation.amount)),
      })),
    },
  ];
}
