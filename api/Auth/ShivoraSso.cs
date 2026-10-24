using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Purchase.Api.Auth;

/// <summary>
/// Sign-in from the Shivora International staff portal (shivorainternational.in).
/// The portal hands this ERP a one-minute pass, "payload.signature" (base64url,
/// HMAC-SHA256 with Sso:Secret, which only the portal and this API know), naming
/// the user of this ERP to sign in as. Each pass works once.
/// </summary>
public static class ShivoraSso
{
    public record Pass(string Usr, string By);

    private static readonly ConcurrentDictionary<string, DateTime> Used = new();

    /// <summary>The pass if it is genuine, for this ERP, unexpired and not used before; otherwise null.</summary>
    public static Pass? Verify(string? token, string? secret, string audience)
    {
        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(secret)) return null;
        var parts = token.Split('.');
        if (parts.Length != 2) return null;

        using var h = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var expected = h.ComputeHash(Encoding.ASCII.GetBytes(parts[0]));
        byte[] given;
        try { given = FromB64(parts[1]); } catch { return null; }
        if (!CryptographicOperations.FixedTimeEquals(expected, given)) return null;

        JsonElement p;
        try { p = JsonDocument.Parse(FromB64(parts[0])).RootElement; } catch { return null; }
        string Str(string k) => p.TryGetProperty(k, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() ?? "" : "";
        var exp = p.TryGetProperty("exp", out var e) && e.TryGetInt64(out var x) ? x : 0;
        if (Str("aud") != audience || exp < DateTimeOffset.UtcNow.ToUnixTimeSeconds() || Str("usr") == "") return null;

        // One use only; forget passes once they have expired anyway
        foreach (var old in Used.Where(u => u.Value < DateTime.UtcNow).Select(u => u.Key).ToList()) Used.TryRemove(old, out _);
        if (!Used.TryAdd(Str("jti"), DateTime.UtcNow.AddMinutes(2))) return null;

        return new Pass(Str("usr"), Str("by"));
    }

    private static byte[] FromB64(string s)
    {
        s = s.Replace('-', '+').Replace('_', '/');
        return Convert.FromBase64String(s.PadRight(s.Length + (4 - s.Length % 4) % 4, '='));
    }
}
