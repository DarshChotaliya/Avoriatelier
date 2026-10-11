using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Purchase.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDiamondAverages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "avg_price",
                table: "purchase_diamond_item",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "avg_weight",
                table: "purchase_diamond_item",
                type: "numeric(12,3)",
                precision: 12,
                scale: 3,
                nullable: false,
                defaultValue: 0m);

            // Fill the averages for diamonds bought before these columns existed.
            migrationBuilder.Sql("""
                UPDATE purchase_diamond_item
                SET avg_weight = ROUND(carat / quantity, 3), avg_price = ROUND(amount / quantity, 2)
                WHERE quantity > 0;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "avg_price",
                table: "purchase_diamond_item");

            migrationBuilder.DropColumn(
                name: "avg_weight",
                table: "purchase_diamond_item");
        }
    }
}
