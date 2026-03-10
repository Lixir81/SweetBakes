<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

  <xsl:template match="/">
    <html>
      <head>
        <title>Sweet Bakes - Products Report</title>
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
          
          .summary {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
          }
          
          .summary p {
            font-size: 1.1rem;
            margin: 0.5rem 0;
          }
          
          .total-value {
            color: #C9A961;
            font-weight: bold;
            font-size: 1.3rem;
          }
        </style>
      </head>
      <body>
        <h1>🍰 Sweet Bakes Products Report</h1>
        
        <table>
          <thead>
            <tr>
              <th>Product ID</th>
              <th>Name</th>
              <th>Description</th>
              <th>Price</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            <xsl:for-each select="products/product">
              <tr>
                <td><xsl:value-of select="id"/></td>
                <td><xsl:value-of select="n"/></td>
                <td><xsl:value-of select="description"/></td>
                <td class="price">$<xsl:value-of select="format-number(price, '0.00')"/></td>
                <td><xsl:value-of select="stock"/></td>
              </tr>
            </xsl:for-each>
          </tbody>
        </table>
        
        <div class="summary">
          <p>Total Products: <span class="total-value"><xsl:value-of select="count(products/product)"/></span></p>
          <p>Total Inventory Value: <span class="total-value">$<xsl:value-of select="format-number(sum(products/product/price * products/product/stock), '0.00')"/></span></p>
        </div>
      </body>
    </html>
  </xsl:template>

</xsl:stylesheet>
