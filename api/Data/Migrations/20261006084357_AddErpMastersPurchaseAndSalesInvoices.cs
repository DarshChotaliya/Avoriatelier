using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Purchase.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddErpMastersPurchaseAndSalesInvoices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "branch",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_branch", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "customer",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    contact_no = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    city = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    state = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    gst_no = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_customer", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "diamond_type",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    sku_prefix = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_diamond_type", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "item_category",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_item_category", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "item_collection",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_item_collection", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "metal_type",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    metal = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    purity = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    rate = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_metal_type", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "purchase_invoice",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    purchase_date = table.Column<DateOnly>(type: "date", nullable: false),
                    branch = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    supplier_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    supplier_invoice_no = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    supplier_invoice_date = table.Column<DateOnly>(type: "date", nullable: true),
                    remarks = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    igst = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_purchase_invoice", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "sales_invoice",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    invoice_no = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    invoice_date = table.Column<DateOnly>(type: "date", nullable: false),
                    branch = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    customer_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    contact_no = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    city = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    state = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    sales_channel = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    payment_method = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    payment_status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    order_status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    courier_partner = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    tracking_no = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    shipping = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    expenses = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    billing_address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    shipping_address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    shipping_same_as_billing = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_sales_invoice", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "stone_type",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    pricing = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    rate = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_stone_type", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "supplier",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    contact_no = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    city = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    state = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    gst_no = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    pan_no = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_supplier", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "purchase_invoice_item",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    purchase_invoice_id = table.Column<int>(type: "integer", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    sku_no = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    design_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    collection = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    size = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    diamond_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    metal_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    qty = table.Column<int>(type: "integer", nullable: false),
                    gross_weight = table.Column<decimal>(type: "numeric(12,3)", precision: 12, scale: 3, nullable: false),
                    net_weight = table.Column<decimal>(type: "numeric(12,3)", precision: 12, scale: 3, nullable: false),
                    metal_rate = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    labour_rate = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    labour_minimum = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    hallmark = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    other_charges = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    mrp = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    discount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    gst_percent = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    igst = table.Column<bool>(type: "boolean", nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    photo = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_purchase_invoice_item", x => x.id);
                    table.ForeignKey(
                        name: "fk_purchase_invoice_item_purchase_invoice_purchase_invoice_id",
                        column: x => x.purchase_invoice_id,
                        principalTable: "purchase_invoice",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "sales_invoice_line",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    sales_invoice_id = table.Column<int>(type: "integer", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    sku_no = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    qty = table.Column<int>(type: "integer", nullable: false),
                    net_weight = table.Column<decimal>(type: "numeric(12,3)", precision: 12, scale: 3, nullable: false),
                    mrp = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    discount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    selling = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    gst_percent = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    igst = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_sales_invoice_line", x => x.id);
                    table.ForeignKey(
                        name: "fk_sales_invoice_line_sales_invoice_sales_invoice_id",
                        column: x => x.sales_invoice_id,
                        principalTable: "sales_invoice",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "purchase_item_diamond",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    purchase_invoice_item_id = table.Column<int>(type: "integer", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    size = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    pcs = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    weight = table.Column<decimal>(type: "numeric(12,3)", precision: 12, scale: 3, nullable: false),
                    rate = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_purchase_item_diamond", x => x.id);
                    table.ForeignKey(
                        name: "fk_purchase_item_diamond_purchase_invoice_items_purchase_invoi",
                        column: x => x.purchase_invoice_item_id,
                        principalTable: "purchase_invoice_item",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "purchase_item_stone",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    purchase_invoice_item_id = table.Column<int>(type: "integer", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    stone_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    pricing = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    pcs = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    weight = table.Column<decimal>(type: "numeric(12,3)", precision: 12, scale: 3, nullable: false),
                    rate = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_purchase_item_stone", x => x.id);
                    table.ForeignKey(
                        name: "fk_purchase_item_stone_purchase_invoice_items_purchase_invoice",
                        column: x => x.purchase_invoice_item_id,
                        principalTable: "purchase_invoice_item",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_branch_name",
                table: "branch",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_customer_name",
                table: "customer",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_diamond_type_name",
                table: "diamond_type",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_item_category_name",
                table: "item_category",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_item_collection_name",
                table: "item_collection",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_metal_type_name",
                table: "metal_type",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_purchase_invoice_purchase_date",
                table: "purchase_invoice",
                column: "purchase_date");

            migrationBuilder.CreateIndex(
                name: "ix_purchase_invoice_item_purchase_invoice_id",
                table: "purchase_invoice_item",
                column: "purchase_invoice_id");

            migrationBuilder.CreateIndex(
                name: "ix_purchase_invoice_item_sku_no",
                table: "purchase_invoice_item",
                column: "sku_no",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_purchase_item_diamond_purchase_invoice_item_id",
                table: "purchase_item_diamond",
                column: "purchase_invoice_item_id");

            migrationBuilder.CreateIndex(
                name: "ix_purchase_item_stone_purchase_invoice_item_id",
                table: "purchase_item_stone",
                column: "purchase_invoice_item_id");

            migrationBuilder.CreateIndex(
                name: "ix_sales_invoice_invoice_date",
                table: "sales_invoice",
                column: "invoice_date");

            migrationBuilder.CreateIndex(
                name: "ix_sales_invoice_invoice_no",
                table: "sales_invoice",
                column: "invoice_no",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_sales_invoice_line_sales_invoice_id",
                table: "sales_invoice_line",
                column: "sales_invoice_id");

            migrationBuilder.CreateIndex(
                name: "ix_sales_invoice_line_sku_no",
                table: "sales_invoice_line",
                column: "sku_no");

            migrationBuilder.CreateIndex(
                name: "ix_stone_type_name",
                table: "stone_type",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_supplier_name",
                table: "supplier",
                column: "name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "branch");

            migrationBuilder.DropTable(
                name: "customer");

            migrationBuilder.DropTable(
                name: "diamond_type");

            migrationBuilder.DropTable(
                name: "item_category");

            migrationBuilder.DropTable(
                name: "item_collection");

            migrationBuilder.DropTable(
                name: "metal_type");

            migrationBuilder.DropTable(
                name: "purchase_item_diamond");

            migrationBuilder.DropTable(
                name: "purchase_item_stone");

            migrationBuilder.DropTable(
                name: "sales_invoice_line");

            migrationBuilder.DropTable(
                name: "stone_type");

            migrationBuilder.DropTable(
                name: "supplier");

            migrationBuilder.DropTable(
                name: "purchase_invoice_item");

            migrationBuilder.DropTable(
                name: "sales_invoice");

            migrationBuilder.DropTable(
                name: "purchase_invoice");
        }
    }
}
