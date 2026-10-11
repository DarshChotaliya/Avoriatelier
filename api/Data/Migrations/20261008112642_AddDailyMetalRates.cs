using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Purchase.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDailyMetalRates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "quote_percent",
                table: "metal_type",
                type: "numeric(6,2)",
                precision: 6,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "daily_metal_rate",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    metal = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    rate = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_daily_metal_rate", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_daily_metal_rate_metal",
                table: "daily_metal_rate",
                column: "metal",
                unique: true);

            // The client's METAL CALCULATION sheet: quotation % of 999 per quality, 14KT weighs 1.25 × silver, and 9KT.
            migrationBuilder.Sql("""
                UPDATE metal_type SET quote_percent = CASE upper(name)
                    WHEN 'S925' THEN 92.5 WHEN '9KT' THEN 40 WHEN '14KT' THEN 61.3 WHEN '18KT' THEN 78
                    WHEN '22KT' THEN 94 WHEN '24KT' THEN 100 ELSE 0 END;
                UPDATE metal_type SET weight_factor = 1.25 WHERE upper(name) = '14KT' AND weight_factor = 1.35;
                INSERT INTO metal_type (name, metal, purity, rate, quote_rate, weight_factor, quote_percent, created_at, updated_at)
                SELECT '9KT', 'Gold', 37.5, 0, 0, 1.1, 40, now(), now()
                WHERE NOT EXISTS (SELECT 1 FROM metal_type WHERE upper(name) = '9KT');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "daily_metal_rate");

            migrationBuilder.DropColumn(
                name: "quote_percent",
                table: "metal_type");
        }
    }
}
