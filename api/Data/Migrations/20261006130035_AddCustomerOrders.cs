using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Purchase.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "customer_order",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    order_no = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    branch = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    client_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    contact_no = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    client_order_date = table.Column<DateOnly>(type: "date", nullable: false),
                    order_placed_date = table.Column<DateOnly>(type: "date", nullable: true),
                    cad_confirmed_date = table.Column<DateOnly>(type: "date", nullable: true),
                    delivery_date = table.Column<DateOnly>(type: "date", nullable: true),
                    completed_date = table.Column<DateOnly>(type: "date", nullable: true),
                    description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    design_ref = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    metal_type = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    diamond_type = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    qty = table.Column<int>(type: "integer", nullable: false),
                    manufacturer = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    quotation_no = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    updated_by = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_customer_order", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_customer_order_client_order_date",
                table: "customer_order",
                column: "client_order_date");

            migrationBuilder.CreateIndex(
                name: "ix_customer_order_order_no",
                table: "customer_order",
                column: "order_no",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "customer_order");
        }
    }
}
