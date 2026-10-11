using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Purchase.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomQuotations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "cad_charge",
                table: "quotation_line",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "category",
                table: "quotation_line",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "design_link",
                table: "quotation_line",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "diamond_ct",
                table: "quotation_line",
                type: "numeric(12,3)",
                precision: 12,
                scale: 3,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "diamond_rate",
                table: "quotation_line",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "is_custom",
                table: "quotation_line",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "photo",
                table: "quotation_line",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "size",
                table: "quotation_line",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "advance",
                table: "quotation",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "advance",
                table: "customer_order",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "photo",
                table: "customer_order",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "cad_charge",
                table: "quotation_line");

            migrationBuilder.DropColumn(
                name: "category",
                table: "quotation_line");

            migrationBuilder.DropColumn(
                name: "design_link",
                table: "quotation_line");

            migrationBuilder.DropColumn(
                name: "diamond_ct",
                table: "quotation_line");

            migrationBuilder.DropColumn(
                name: "diamond_rate",
                table: "quotation_line");

            migrationBuilder.DropColumn(
                name: "is_custom",
                table: "quotation_line");

            migrationBuilder.DropColumn(
                name: "photo",
                table: "quotation_line");

            migrationBuilder.DropColumn(
                name: "size",
                table: "quotation_line");

            migrationBuilder.DropColumn(
                name: "advance",
                table: "quotation");

            migrationBuilder.DropColumn(
                name: "advance",
                table: "customer_order");

            migrationBuilder.DropColumn(
                name: "photo",
                table: "customer_order");
        }
    }
}
