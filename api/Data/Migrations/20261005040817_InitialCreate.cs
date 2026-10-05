using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Purchase.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "purchase",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    purchase_no = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    purchase_date = table.Column<DateOnly>(type: "date", nullable: false),
                    supplier_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    invoice_no = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    purchase_type = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    payment_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    remarks = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    gross_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    discount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    taxable_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    cgst_percent = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    cgst_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    sgst_percent = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    sgst_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    igst_percent = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    igst_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    round_off = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    net_purchase_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_purchase", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "purchase_diamond_item",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    purchase_id = table.Column<int>(type: "integer", nullable: false),
                    packet_lot_no = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    shape = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    carat = table.Column<decimal>(type: "numeric(12,3)", precision: 12, scale: 3, nullable: false),
                    color = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    clarity = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    cut = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    polish = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    symmetry = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    fluorescence = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    certificate_no = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    certificate_date = table.Column<DateOnly>(type: "date", nullable: true),
                    quantity = table.Column<int>(type: "integer", nullable: false),
                    rate_per_carat = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    discount_percent = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_purchase_diamond_item", x => x.id);
                    table.ForeignKey(
                        name: "fk_purchase_diamond_item_purchase_purchase_id",
                        column: x => x.purchase_id,
                        principalTable: "purchase",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "purchase_gold_item",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    purchase_id = table.Column<int>(type: "integer", nullable: false),
                    gold_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    purity = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    gross_weight = table.Column<decimal>(type: "numeric(12,3)", precision: 12, scale: 3, nullable: false),
                    stone_weight = table.Column<decimal>(type: "numeric(12,3)", precision: 12, scale: 3, nullable: false),
                    net_weight = table.Column<decimal>(type: "numeric(12,3)", precision: 12, scale: 3, nullable: false),
                    wastage_percent = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    wastage_weight = table.Column<decimal>(type: "numeric(12,3)", precision: 12, scale: 3, nullable: false),
                    chargeable_weight = table.Column<decimal>(type: "numeric(12,3)", precision: 12, scale: 3, nullable: false),
                    rate_per_gram = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    gold_value = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    making_charges = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    other_charges = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_purchase_gold_item", x => x.id);
                    table.ForeignKey(
                        name: "fk_purchase_gold_item_purchase_purchase_id",
                        column: x => x.purchase_id,
                        principalTable: "purchase",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "purchase_silver_item",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    purchase_id = table.Column<int>(type: "integer", nullable: false),
                    silver_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    purity = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    gross_weight = table.Column<decimal>(type: "numeric(12,3)", precision: 12, scale: 3, nullable: false),
                    stone_weight = table.Column<decimal>(type: "numeric(12,3)", precision: 12, scale: 3, nullable: false),
                    net_weight = table.Column<decimal>(type: "numeric(12,3)", precision: 12, scale: 3, nullable: false),
                    rate_per_gram = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    silver_value = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    making_charges = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    other_charges = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_purchase_silver_item", x => x.id);
                    table.ForeignKey(
                        name: "fk_purchase_silver_item_purchase_purchase_id",
                        column: x => x.purchase_id,
                        principalTable: "purchase",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_purchase_purchase_date",
                table: "purchase",
                column: "purchase_date");

            migrationBuilder.CreateIndex(
                name: "ix_purchase_purchase_no",
                table: "purchase",
                column: "purchase_no",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_purchase_diamond_item_purchase_id",
                table: "purchase_diamond_item",
                column: "purchase_id");

            migrationBuilder.CreateIndex(
                name: "ix_purchase_gold_item_purchase_id",
                table: "purchase_gold_item",
                column: "purchase_id");

            migrationBuilder.CreateIndex(
                name: "ix_purchase_silver_item_purchase_id",
                table: "purchase_silver_item",
                column: "purchase_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "purchase_diamond_item");

            migrationBuilder.DropTable(
                name: "purchase_gold_item");

            migrationBuilder.DropTable(
                name: "purchase_silver_item");

            migrationBuilder.DropTable(
                name: "purchase");
        }
    }
}
