using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Purchase.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSaleBillColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "description",
                table: "sales_invoice_line",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "dia_amount",
                table: "sales_invoice_line",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "dia_pcs",
                table: "sales_invoice_line",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "dia_weight",
                table: "sales_invoice_line",
                type: "numeric(12,3)",
                precision: 12,
                scale: 3,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "gross_weight",
                table: "sales_invoice_line",
                type: "numeric(12,3)",
                precision: 12,
                scale: 3,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "hsn_sac",
                table: "sales_invoice_line",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "making_charges",
                table: "sales_invoice_line",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "metal_amount",
                table: "sales_invoice_line",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "metal_type",
                table: "sales_invoice_line",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "stone_amount",
                table: "sales_invoice_line",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "stone_pcs",
                table: "sales_invoice_line",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "stone_weight",
                table: "sales_invoice_line",
                type: "numeric(12,3)",
                precision: 12,
                scale: 3,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "round_off",
                table: "sales_invoice",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "description",
                table: "sales_invoice_line");

            migrationBuilder.DropColumn(
                name: "dia_amount",
                table: "sales_invoice_line");

            migrationBuilder.DropColumn(
                name: "dia_pcs",
                table: "sales_invoice_line");

            migrationBuilder.DropColumn(
                name: "dia_weight",
                table: "sales_invoice_line");

            migrationBuilder.DropColumn(
                name: "gross_weight",
                table: "sales_invoice_line");

            migrationBuilder.DropColumn(
                name: "hsn_sac",
                table: "sales_invoice_line");

            migrationBuilder.DropColumn(
                name: "making_charges",
                table: "sales_invoice_line");

            migrationBuilder.DropColumn(
                name: "metal_amount",
                table: "sales_invoice_line");

            migrationBuilder.DropColumn(
                name: "metal_type",
                table: "sales_invoice_line");

            migrationBuilder.DropColumn(
                name: "stone_amount",
                table: "sales_invoice_line");

            migrationBuilder.DropColumn(
                name: "stone_pcs",
                table: "sales_invoice_line");

            migrationBuilder.DropColumn(
                name: "stone_weight",
                table: "sales_invoice_line");

            migrationBuilder.DropColumn(
                name: "round_off",
                table: "sales_invoice");
        }
    }
}
