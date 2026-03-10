<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

  <xsl:template match="/">
    <html>
      <head>
        <title>Sweet Bakes - Orders Report</title>
        <style>
          body {
            font-family: 'Georgia', serif;
            background: #FAF8F3;
            padding: 2rem;
            color: #3E2723;
          }
          
          h1 {
            text-align: center;
            color: #3E2723;
            font-size: 2.5rem;
            margin-bottom: 2rem;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
          }
          
          thead {
            background: #E8D5C4;
          }
          
          th {
            padding: 1rem;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #C9A961;
            color: #3E2723;
          }
          
          td {
            padding: 1rem;
            border-bottom: 1px solid #eee;
          }
          
          tr:hover {
            background: #FAF8F3;
          }
          
          .price {
            color: #C9A961;
            font-weight: bold;
            font-size: 1.1rem;
          }
          
          .status {
            font-weight: 600;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            display: inline-block;
          }
          
          .status.pending {
            background: #FFF3CD;
            color: #856404;
          }
          
          .status.confirmed {
            background: #D1ECF1;
            color: #0C5460;
          }
          
          .status.ready {
            background: #D4EDDA;
            color: #155724;
          }
          
          .status.completed {
            background: #C3E6CB;
            color: #155724;
          }
          
          .summary {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
          }
          
          .stat {
            text-align: center;
          }
          
          .stat-label {
            font-size: 0.9rem;
            color: #8D6E63;
            margin-bottom: 0.5rem;
          }
          
          .stat-value {
            color: #C9A961;
            font-weight: bold;
            font-size: 1.5rem;
          }
        </style>
      </head>
      <body>
        <h1>🍰 Sweet Bakes Orders Report</h1>
        
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Total</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            <xsl:for-each select="orders/order">
              <tr>
                <td>#<xsl:value-of select="id"/></td>
                <td><xsl:value-of select="username"/></td>
                <td><xsl:value-of select="product_name"/></td>
                <td><xsl:value-of select="quantity"/></td>
                <td class="price">$<xsl:value-of select="format-number(total_price, '0.00')"/></td>
                <td>
                  <span class="status">
                    <xsl:attribute name="class">status <xsl:value-of select="translate(status, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')"/></xsl:attribute>
                    <xsl:value-of select="status"/>
                  </span>
                </td>
                <td><xsl:value-of select="substring(created_at, 1, 10)"/></td>
              </tr>
            </xsl:for-each>
          </tbody>
        </table>
        
        <div class="summary">
          <div class="stat">
            <div class="stat-label">Total Orders</div>
            <div class="stat-value"><xsl:value-of select="count(orders/order)"/></div>
          </div>
          <div class="stat">
            <div class="stat-label">Total Revenue</div>
            <div class="stat-value">$<xsl:value-of select="format-number(sum(orders/order/total_price), '0.00')"/></div>
          </div>
          <div class="stat">
            <div class="stat-label">Total Items Sold</div>
            <div class="stat-value"><xsl:value-of select="sum(orders/order/quantity)"/></div>
          </div>
          <div class="stat">
            <div class="stat-label">Pending Orders</div>
            <div class="stat-value"><xsl:value-of select="count(orders/order[status='pending'])"/></div>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>

</xsl:stylesheet>
