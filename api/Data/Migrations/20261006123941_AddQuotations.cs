using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Purchase.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddQuotations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "weight_factor",
                table: "metal_type",
                type: "numeric(6,3)",
                precision: 6,
                scale: 3,
                nullable: false,
                defaultValue: 1m);

            // Starting weight factors for the gold qualities already in Metal Types (S925 silver = 1).
            migrationBuilder.Sql("""
                UPDATE metal_type SET weight_factor = CASE upper(name)
                    WHEN '14KT' THEN 1.35 WHEN '18KT' THEN 1.5 WHEN '22KT' THEN 1.7 WHEN '24KT' THEN 1.85
                    ELSE weight_factor END
                WHERE metal = 'Gold';
                """);

            migrationBuilder.CreateTable(
                name: "quotation",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    quotation_no = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    quotation_date = table.Column<DateOnly>(type: "date", nullable: false),
                    branch = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    customer_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    contact_no = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    updated_by = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_quotation", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "quotation_line",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    quotation_id = table.Column<int>(type: "integer", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    sku_no = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    from_metal = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    from_weight = table.Column<decimal>(type: "numeric(12,3)", precision: 12, scale: 3, nullable: false),
                    to_metal = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    weight = table.Column<decimal>(type: "numeric(12,3)", precision: 12, scale: 3, nullable: false),
                    qty = table.Column<int>(type: "integer", nullable: false),
                    metal_rate = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    labour_type = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    labour_rate = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    stone_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    other_charges = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    gst_percent = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_quotation_line", x => x.id);
                    table.ForeignKey(
                        name: "fk_quotation_line_quotations_quotation_id",
                        column: x => x.quotation_id,
                        principalTable: "quotation",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_quotation_quotation_date",
                table: "quotation",
                column: "quotation_date");

            migrationBuilder.CreateIndex(
                name: "ix_quotation_quotation_no",
                table: "quotation",
                column: "quotation_no",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_quotation_line_quotation_id",
                table: "quotation_line",
                column: "quotation_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "quotation_line");

            migrationBuilder.DropTable(
                name: "quotation");

            migrationBuilder.DropColumn(
                name: "weight_factor",
                table: "metal_type");
        }
    }
}
