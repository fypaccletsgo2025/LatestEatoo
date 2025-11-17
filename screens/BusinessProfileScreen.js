// screens/BusinessProfileScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { db, DB_ID, COL, ensureSession } from '../appwrite';
import { Query, ID } from 'appwrite';
import BackButton from '../components/BackButton';

const BRAND = {
  primary: '#FF4D00',
  accent: '#FDAA48',
  bg: '#FFF5ED',
  card: '#FFFFFF',
  line: '#FFE3C6',
  ink: '#1F2937',
  inkMuted: '#6B7280',
};

export default function BusinessProfileScreen() {
  const navigation = useNavigation();
  const [bp, setBp] = React.useState(null);
  const [showForm, setShowForm] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState('');
  const [submittingForm, setSubmittingForm] = React.useState(false);

  // Form fields
  const [name, setName] = React.useState('');
  const [registrationNo, setRegistrationNo] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [city, setCity] = React.useState('');
  const [stateVal, setStateVal] = React.useState('');
  const [postcode, setPostcode] = React.useState('');
  const [cuisines, setCuisines] = React.useState('');
  const [website, setWebsite] = React.useState('');
  const [theme, setTheme] = React.useState('');
  const [ambience, setAmbience] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const normalizeRequest = React.useCallback((doc) => {
    if (!doc) return null;
    return {
      id: doc.$id,
      status: doc.status || 'pending',
      data: {
        businessName: doc.businessName || '',
        registrationNo: doc.registrationNo || '',
        email: doc.email || '',
        phone: doc.phone || '',
        address: doc.address || '',
        city: doc.city || '',
        state: doc.state || '',
        postcode: doc.postcode || '',
        cuisines: Array.isArray(doc.cuisines) ? doc.cuisines : [],
        website: doc.website || '',
        theme: Array.isArray(doc.theme) ? doc.theme : (doc.theme ? [doc.theme] : []),
        ambience: Array.isArray(doc.ambience) ? doc.ambience : (doc.ambience ? [doc.ambience] : []),
        note: doc.note || doc.notes || '',
      },
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const loadRequest = async () => {
      try {
        setLoading(true);
        setFetchError('');
        await ensureSession();
        let ownerId = null;
        const queries = [Query.limit(1), Query.orderDesc('$createdAt')];
        const res = await db.listDocuments(DB_ID, COL.restaurantRequests, queries);
        if (cancelled) return;
        const doc = res.documents?.[0];
        setBp(doc ? normalizeRequest(doc) : null);
      } catch (error) {
        if (!cancelled) {
          setFetchError(error?.message || 'Unable to load your submission.');
          setBp(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadRequest();
    return () => {
      cancelled = true;
    };
  }, [normalizeRequest]);

  const submit = async () => {
    if (submittingForm) return;
    const trimmedName = name.trim();
    const trimmedRegNo = registrationNo.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedRegNo || !trimmedEmail) {
      Alert.alert(
        'Missing info',
        'Please fill Business Name, Registration No., and Email.'
      );
      return;
    }

    const cuisinesList = cuisines
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    const themeList = theme
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    const ambienceList = ambience
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    const payload = {
      businessName: trimmedName,
      registrationNo: trimmedRegNo,
      email: trimmedEmail,
      phone: phone.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      state: stateVal.trim() || null,
      postcode: postcode.trim() || null,
      cuisines: cuisinesList,
      website: website.trim() || null,
      theme: themeList,
      ambience: ambienceList,
      note: notes.trim() || null,
      status: 'pending',
    };

    try {
      setSubmittingForm(true);
      await ensureSession();
      const doc = await db.createDocument(
        DB_ID,
        COL.restaurantRequests,
        ID.unique(),
        payload
      );
      setBp(normalizeRequest(doc));
      setShowForm(false);
      setName('');
      setRegistrationNo('');
      setEmail('');
      setPhone('');
      setAddress('');
      setCity('');
      setStateVal('');
      setPostcode('');
      setCuisines('');
      setWebsite('');
      setTheme('');
      setAmbience('');
      setNotes('');
      Alert.alert(
        'Thank you!',
        'Your business registration has been submitted for moderation.'
      );
    } catch (error) {
      Alert.alert('Submission failed', error?.message || 'Please try again later.');
    } finally {
      setSubmittingForm(false);
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: BRAND.bg }}
      edges={['top', 'right', 'bottom', 'left']}
    >
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Business Profile</Text>
          <Text style={styles.headerSubtitle}>
            Register your restaurant and manage your menu presence.
          </Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {fetchError ? (
          <View style={styles.card}>
            <Text style={[styles.bodyCopy, { color: '#DC2626' }]}>{fetchError}</Text>
          </View>
        ) : null}

        {loading && !bp && !showForm ? (
          <View style={styles.card}>
            <Text style={styles.bodyCopy}>Checking for existing submissions...</Text>
          </View>
        ) : null}

        {/* Pending/Approved state */}
        {bp && !showForm ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Submission Status</Text>
            <StatusBadge
              text={bp.status === 'pending' ? 'Pending Review' : bp.status}
            />
            <View style={{ marginTop: 12, gap: 6 }}>
              <MetaRow label="Business" value={bp.data.businessName} />
              <MetaRow label="Reg No." value={bp.data.registrationNo} />
              <MetaRow label="Email" value={bp.data.email} />
              {!!bp.data.phone && <MetaRow label="Phone" value={bp.data.phone} />}
              {!!bp.data.address && <MetaRow label="Address" value={bp.data.address} />}
              {!!bp.data.theme?.length && (
                <MetaRow label="Theme" value={bp.data.theme.join(', ')} />
              )}
              {!!bp.data.ambience?.length && (
                <MetaRow label="Ambience" value={bp.data.ambience.join(', ')} />
              )}
              {!!bp.data.cuisines?.length && (
                <MetaRow label="Cuisines" value={bp.data.cuisines.join(', ')} />
              )}
            </View>
            <Text style={styles.note}>
              Our team will contact you for verification and next steps.
            </Text>
          </View>
        ) : null}

        {/* Landing when not registered */}
        {!bp && !showForm ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Start a Business Account?</Text>
            <Text style={styles.bodyCopy}>
              Register to manage your restaurant details, share updates, and appear in
              recommendations.
            </Text>
            <TouchableOpacity
              onPress={() => setShowForm(true)}
              style={[styles.btn, styles.primaryBtn]}
            >
              <Text style={styles.btnText}>Start Registration</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Registration form */}
        {showForm && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Business Registration</Text>
            <LabeledInput label="Business Name *" value={name} onChangeText={setName} />
            <LabeledInput
              label="Registration No. (SSM) *"
              value={registrationNo}
              onChangeText={setRegistrationNo}
            />
            <LabeledInput
              label="Email *"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <LabeledInput
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <LabeledInput label="Address" value={address} onChangeText={setAddress} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <LabeledInput label="City" value={city} onChangeText={setCity} />
              </View>
              <View style={{ flex: 1 }}>
                <LabeledInput label="State" value={stateVal} onChangeText={setStateVal} />
              </View>
            </View>
            <LabeledInput
              label="Postcode"
              value={postcode}
              onChangeText={setPostcode}
              keyboardType="number-pad"
            />
            <LabeledInput label="Cuisines (comma separated)" value={cuisines} onChangeText={setCuisines} />
            <LabeledInput
              label="Website / Instagram (optional)"
              value={website}
              onChangeText={setWebsite}
            />
            <LabeledInput
              label="Theme (comma separated)"
              value={theme}
              onChangeText={setTheme}
            />
            <LabeledInput
              label="Ambience (comma separated)"
              value={ambience}
              onChangeText={setAmbience}
            />
            <LabeledInput
              label="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              multiline
              minHeight={80}
            />

            <TouchableOpacity
              onPress={submit}
              style={[styles.btn, styles.primaryBtn, submittingForm && { opacity: 0.7 }]}
              disabled={submittingForm}
            >
              <Text style={styles.btnText}>
                {submittingForm ? 'Submitting...' : 'Submit'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowForm(false)}
              style={[styles.btn, styles.secondaryBtn]}
            >
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Demo section removed */}
      </ScrollView>
    </SafeAreaView>
  );
}

function LabeledInput({ label, style, minHeight, ...props }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={[
          styles.input,
          style,
          minHeight ? { minHeight, textAlignVertical: 'top' } : null,
        ]}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}

function StatusBadge({ text }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

function MetaRow({ label, value }) {
  return (
    <Text style={styles.meta}>
      <Text style={styles.metaLabel}>{label}:</Text> {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: BRAND.primary,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSubtitle: {
    color: '#FFEBD8',
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  container: {
    padding: 20,
    backgroundColor: BRAND.bg,
    gap: 16,
  },
  card: {
    backgroundColor: BRAND.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: BRAND.line,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 4,
  },
  cardTitle: {
    fontWeight: '800',
    fontSize: 16,
    color: BRAND.ink,
    marginBottom: 6,
  },
  label: {
    fontWeight: '700',
    marginBottom: 6,
    color: BRAND.ink,
  },
  input: {
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
    color: BRAND.ink,
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryBtn: { backgroundColor: BRAND.primary },
  darkBtn: { backgroundColor: '#1F2937' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: BRAND.line,
    backgroundColor: '#fff',
  },
  btnText: { color: '#fff', fontWeight: '700' },
  secondaryBtnText: { color: BRAND.ink, fontWeight: '700' },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFECC2',
    marginTop: 4,
  },
  badgeText: { color: BRAND.ink, fontWeight: '600', fontSize: 12 },
  meta: { color: BRAND.ink, fontSize: 13 },
  metaLabel: { fontWeight: '700' },
  note: { color: BRAND.inkMuted, marginTop: 12, fontSize: 13, lineHeight: 18 },
  bodyCopy: { color: BRAND.inkMuted, fontSize: 14, lineHeight: 20 },
});
